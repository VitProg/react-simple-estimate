import { CERT_CARDS, TIME_CARDS } from "./constants.ts";
import { DataConnection } from "peerjs";

export type User = {
  id: string;
  name: string;
  joinTime?: number;
  conn?: DataConnection;
  ready?: boolean;
};

export type SelectedCard = {
  userId: string;
  type: CardType;
} & (
  {
    type: 'time';
    card: TimeCard;
  } |
  {
    type: 'cert';
    card: CertCard;
  }
);

export type CardType = 'time' | 'cert';
export type TimeCard = (typeof TIME_CARDS)[number];
export type CertCard = (typeof CERT_CARDS)[number];
export type Card = TimeCard | CertCard;
export type CardTypeMap<C extends CardType> = C extends 'time' ? TimeCard : CertCard;

export type SyncUsersMessage = {
  type: 'sync-users',
  users: Pick<User, 'id' | 'name' | 'ready'>[],
};

export type SyncCardSelectMessage = {
  type: 'sync-card-select',
  cards: SelectedCard[],
};

export type CardSelectionMessage = {
  type: 'card-select'
  cardType: CardType,
  card: Card,
  selected: boolean,
  userId: string,
}

export type UserReadyMessage = {
  type: 'user-ready',
  userId: string,
}

export type FinMessage = {
  type: 'fin',
}

export type NewMessage = {
  type: 'new',
}

export type Message = SyncUsersMessage | CardSelectionMessage | SyncCardSelectMessage | UserReadyMessage | FinMessage | NewMessage;
