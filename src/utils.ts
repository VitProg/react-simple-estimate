import { ID_PREFIX } from "./constants.ts";
import { DataConnection } from "peerjs";
import { Message } from "./types.ts";

export const getRandomId = () => 1000 + Math.ceil(Math.random() * 8999);

export const getID = (peerId: string | number) => `${ID_PREFIX}_${peerId}`;


export const send = (conn: DataConnection, message: Message) => {
  console.log("# sending", message);
  conn.send(message);
};
