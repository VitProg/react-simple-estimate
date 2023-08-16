import { computed, makeAutoObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import { CardType, CardTypeMap, SelectedCard, User } from "./types.ts";

const isSelectedCardsEquals = (a: SelectedCard, b: SelectedCard) => a.userId === b.userId && a.type === b.type && a.card === b.card;

class State {
  users: User[] = [];
  selectedCards: SelectedCard[] = [];
  error?: string;
  fatalError?: string;
  showEnterForm: boolean;
  imHost: boolean;
  fin: boolean;

  constructor() {
    makeAutoObservable(this, {
      selectedCards: observable.deep,
      users: observable.deep,
      isReady: computed.struct,
      iam: computed.struct,
    });
    this.showEnterForm = true;
    this.imHost = false;
    this.fin = false;
  }

  setFin(val: boolean) {
    this.fin = val;
  }
  setImHost(val: boolean) {
    this.imHost = val;
  }

  setShowEnterForm(val: boolean) {
    this.showEnterForm = val;
  }

  setError(error?: string) {
    this.fatalError = error;
  }

  setFatalError(error?: string) {
    this.error = error;
  }

  get isReady() {
    return this.users.length > 1 && !this.fatalError;
  }

  get iam() {
    return !this.fatalError ? this.users?.[0] : undefined;
  }

  hasSelected = computedFn((selectedCard: SelectedCard) => {
    return !!this.selectedCards.find(c => isSelectedCardsEquals(c, selectedCard));
  });

  selectCard(selectedCard: SelectedCard) {
    if (this.hasSelected(selectedCard)) return false;
    this.unSelectCardsForUser(selectedCard.userId, selectedCard.type);
    this.selectedCards = [...this.selectedCards, {...selectedCard}];
    return true;
  }

  unSelectCard(selectedCard: SelectedCard) {
    this.selectedCards = [...this.selectedCards.filter(c => !isSelectedCardsEquals(c, selectedCard))];
  }

  unSelectCardsForUser(userId: string, type: CardType) {
    this.selectedCards = [...this.selectedCards.filter(c => !(c.type == type && c.userId == userId))];
  }

  hasUserSelectedCard: <T extends CardType>(userId: string, type: T, card?: CardTypeMap<T>) => boolean = computedFn(<T extends CardType>(userId: string, type: T, card?: CardTypeMap<T>): boolean => {
    const sc = {
      userId,
      type,
      card,
    } as SelectedCard;
    return this.hasSelected(sc);
  })

  hasUserSelectedAnyCardOfType: (userId: string | undefined, type: CardType) => boolean = computedFn((userId: string | undefined, type: CardType): boolean => {
    if (!userId) return false;
    return this.selectedCards.filter(sc => sc.type == type && sc.userId == userId).length > 0;
  })

  userSelectedCard = computedFn((userId: string, type: CardType) => this.selectedCards.find(sc => sc.userId === userId && sc.type === type));

  get avgTime() {
    const filtered = this.selectedCards.filter(sc => sc.type === "time");
    const avgFloat = filtered
      .reduce((acc, cur) => {
        const val = parseInt(cur.card + '', 10);
        return isNaN(val) ? acc : acc + val;
      }, 0) / filtered.length;
    return Math.round(avgFloat);
  }

  get avgCert() {
    const filtered = this.selectedCards.filter(sc => sc.type === "cert");
    const avgFloat = filtered
      .reduce((acc, cur) => {
        const val = parseInt(cur.card + '', 10);
        return isNaN(val) ? acc : acc + val;
      }, 0) / filtered.length;
    return Math.round(avgFloat);
  }

  fixSelectedCards = () => {
    this.selectedCards = [
      ...this.selectedCards.filter(sc => state.hasUser(sc.userId))
    ];
  }

  setSelectedCards = (selectedCards: SelectedCard[]) => {
    this.selectedCards = [...selectedCards];
  }

  whoChoseCard: <T extends CardType>(type: T, card: CardTypeMap<T>) => string[] = computedFn(<T extends CardType>(type: T, card: CardTypeMap<T>): string[] =>
    this.selectedCards
      .filter(sc => sc.type === type && sc.card === card)
      .map(sc => sc.userId));

  getUser = computedFn((userId: string): User | undefined => this.users.find(u => u.id === userId));

  hasUser = computedFn((userId: string) => {
    return !!this.users.find(u => u.id === userId);
  });

  updateUserName(userId: string, userName: string) {
    this.users.map(u => {
      if (u.id === userId) {
        u.name = userName;
      }
      return u
    });
  }

  addUser(user: User) {
    if (this.hasUser(user.id)) return false;
    user.joinTime = Date.now();
    this.users = [...this.users, user];
    return true;
  }

  clear() {
    this.users = [];
    this.selectedCards = [];
  }

  delUser(userId: string) {
    this.users = [...this.users.filter(u => u.id !== userId)];
  }

  hasUserSelectedBothCards = computedFn((userId?: string) => this.hasUserSelectedAnyCardOfType(userId, "time") && this.hasUserSelectedAnyCardOfType(userId, "cert"));

  userHasReady = computedFn((userId: string) => !!this.getUser(userId)?.ready && this.hasUserSelectedBothCards(userId));

  setUserReady (userId: string, ready: boolean) {
    const u = this.getUser(userId);
    if (u) {
      // if (ready && this.hasUserSelectedBothCards(userId)) {
        u.ready = ready;
      // }
      // u.ready = false;
    }
  }

  get allUsersReady() {
    return this.users.every(u => u.ready && this.hasUserSelectedBothCards(u.id));
  }
}

export const state = new State();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).state = state;
