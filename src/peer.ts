import { peerJsServer } from "./constants.ts";
import { getID, send } from "./utils.ts";
import { Message, SelectedCard, SyncCardSelectMessage, User } from "./types.ts";
import Peer, { DataConnection } from "peerjs";
import { state } from "./state.ts";

class PeerConnect {
  private peer?: Peer = undefined;
  private initialized = false;
  private hostId?: number;
  private reconectInterval?: number;
  private myName?: string;
  private connToHost?: DataConnection;

  constructor() {
  }

  init(userName: string, myId: number) {
    this.myName = userName;

    return new Promise<void>((resolve, reject) => {
      const user: User = {
        id: getID(myId),
        name: userName,
      }

      state.addUser(user);

      this.peer = new Peer(
        user.id,
        peerJsServer
      );

      this.peer.on('open', (id) => {
        console.log('# Registered. My peerId is ' + id);
        this.initialized = true;
        resolve();
      })

      this.peer.on('error', (error) => {
        if (!this.peer?.open) {
          state.clear();
        }
        console.error(error);
        reject();
      });

      this.peer.on('connection', (conn) => {
        console.log('# Connection received');

        conn.on('data', (message) => {
          console.log('# > On Data Message', message);
          this.receiveData(message as Message, true, conn.peer);
        });

        conn.on('open', () => {
          console.log('# > On Open Message', conn.peer);
          state.addUser({
            id: conn.peer,
            name: typeof conn.metadata === 'object' && 'userName' in conn.metadata ? conn.metadata.userName : `[${conn.peer}]`,
            conn,
          });
          this.syncUsers();
          this.syncCardSelect();
        });

        conn.on('close', () => {
          console.log('# > On Close Message', conn.peer);
          conn.close();
          state.delUser(conn.peer);
          this.syncUsers();
          this.syncCardSelect();
        });
      });
    });
  }

  connectToPeer(hostId: number) {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.peer) return false;
      this.hostId = hostId;

      this.connToHost = this.peer.connect(getID(hostId), {
        metadata: {
          userName: state.iam?.name ?? this.myName,
        }
      });

      this.connToHost.on('data', (message) => {
        console.log('# < message from host', this.connToHost?.peer, message);
        this.receiveData(message as Message, false);
      });

      this.connToHost.on('open', () => {
        resolve(true);
        if (!this.connToHost) return;
        console.log('# < connected to host', this.connToHost.peer);
        state.setError(undefined);
        state.addUser({
          id: this.connToHost.peer,
          name: `[${this.connToHost.peer}]`,
          conn: this.connToHost,
        });
        state.setShowEnterForm(false);
      });

      this.connToHost.on('close', () => {
        if (!this.connToHost) return;
        console.log('# < disconnect from host', this.connToHost.peer);
        state.delUser(this.connToHost.peer);
        this.syncUsers();
        this.syncCardSelect();
        // state.clear()
        this.connToHost.close();
        state.setError("Connection lost. Try reconnect...");
        this.reconect();
      });

      this.connToHost.on('error', () => {
        reject();
        console.warn('Failed to connect to the host ' + hostId);
        this.close();
      });

      this.connToHost.on('iceStateChanged', args => {
        console.log('iceStateChanged', args)
      })
    });
  }

  private reconect = async () => {
    console.log('# ..try reconnect..');
    if (!this.hostId) {
      this.reconectInterval && clearInterval(this.reconectInterval);
      console.log('# reconnecting - host is empty ((');
      state.setFatalError("Reconnection error ((( Check host id!");
      return;
    }

    try {
      const timerPromise = new Promise<boolean>(r => setTimeout(() => {
        console.log('# reconnect timeout...');
        r(false);
      }, 2500, false));
      const connectPromise = this.connectToPeer(this.hostId)

      const raceResult = await Promise.race([timerPromise, connectPromise]);

      if (raceResult) {
        this.reconectInterval && clearInterval(this.reconectInterval);
        state.setError(undefined);
        state.setFatalError(undefined);
        return;
      }
    } catch (e) {
      console.warn('# reconnection error (((... try again...');
      // this.reconnectInterval && clearInterval(this.reconectInterval);
      console.error(e);
      // return;
    }

    this.reconectInterval = window.setTimeout(this.reconect, 5000);
  }

  public new() {
    state.setSelectedCards([]);
    state.users.forEach(u => state.setUserReady(u.id, false));
    state.setFin(false);

    const myId = state.iam?.id;

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach((conn, index) => {
      if (conn) {
        send(conn, {
          type: "new",
        });
      }
    })
  }

  public stop() {
    state.setFin(true);

    const myId = state.iam?.id;

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach((conn, index) => {
      if (conn) {
        send(conn, {
          type: "fin",
        });
      }
    })
  }

  public syncUsers() {
    const usersToSend = state.users.map(u => ({id: u.id, name: u.name}));

    const myId = state.iam?.id;

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach((conn, index) => {
      if (conn) {
        send(conn, {
          type: "sync-users",
          users: usersToSend
        });
      }
    })
  }

  public syncCardSelect() {
    state.fixSelectedCards();

    const myId = state.iam?.id;

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach((conn) => {
      if (conn) {
        send(conn, {
          type: "sync-card-select",
          cards: state.selectedCards,
        });
      }
    })
  }

  cardSelect(sc: SelectedCard, isSelected: boolean) {
    const myId = state.iam?.id;
    if (!myId) return;

    isSelected ? state.selectCard(sc) :state.unSelectCardsForUser(sc.userId, sc.type);

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach(conn => {
      if (conn) {
        console.log("%%%%%%%%%%%%%%%%%");
        send(conn, {
          type: "card-select",
          cardType: sc.type,
          card: sc.card,
          userId: myId,
          selected: isSelected,
        });
      }
    });
  }

  userReady(userId?: string) {
    if (!userId) return;

    const myId = state.iam?.id;
    if (!myId) return;

    state.setUserReady(userId, true);

    const conns = this.connToHost
      ? [this.connToHost]
      : state.users.filter(u => u.id !== myId || !!u.conn).map(u => u.conn);

    conns.forEach(conn => {
      if (conn) {
        send(conn, {
          type: 'user-ready',
          userId,
        });
      }
    });
  }

  private receiveData(message: Message, toHost = false, fromUserId?: string) {
    console.log('# receiveData', {message, toHost, userId: fromUserId})
    const myId = state.iam?.id;
    switch (message.type) {
      case "sync-users": {
        message.users.forEach(u => {
          if (state.hasUser(u.id)) {
            state.updateUserName(u.id, u.name);
          } else {
            state.addUser(u);
          }
        });
        break;
      }

      case "sync-card-select": {
        state.setSelectedCards(message.cards);
        break;
      }

      case "card-select": {
        state.unSelectCardsForUser(message.userId, message.cardType);
        if (message.selected) {
          state.selectCard({
            type: message.cardType,
            card: message.card,
            userId: message.userId,
          } as SelectedCard);
        }

        break;
      }

      case "user-ready": {
        state.setUserReady(message.userId, true);
        this.syncUsers();
        break;
      }

      case "fin": {
        state.setFin(true);
        break;
      }

      case "new": {
        state.setSelectedCards([]);
        state.users.forEach(u => state.setUserReady(u.id, false));
        state.setFin(false);
        break;
      }
    }

    if (toHost && !this.connToHost) {
      state.users.forEach(u => {
        if (u.id == myId || u.id == fromUserId || !u.conn) return;
        send(u.conn, message);
      })
    }
  }

  close() {
    state.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = undefined;
    }
  }
}

export const peer = new PeerConnect();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).peer = peer;
