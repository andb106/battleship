export interface BaseMessage<T> {
  type: string;
  data: T;
  id: 0 | number;
}

interface ClientRegData {
  name: string;
  password: string;
}

interface ServerRegData {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
}

interface ClientAddShipsData {
  gameId: number;
  ships: Ship[];
  indexPlayer: number;
}

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
  countShots: number;
}

export interface ClientAttackData {
  gameId: number;
  x: number;
  y: number;
  indexPlayer: number;
}

export interface ClientRandomAttackData {
  gameId: number;
  indexPlayer: number;
}

export type Positions = {
  x: number;
  y: number;
};

interface ServerAttackData {
  position: Positions;
  currentPlayer: number;
  status: 'miss' | 'killed' | 'shot';
}

export type ClientRegMessage = BaseMessage<ClientRegData>;
export type ServerRegMessage = BaseMessage<ServerRegData>;

export type ClientAddShipsMessage = BaseMessage<ClientAddShipsData>;

export type ClientAttackMessage = BaseMessage<ClientAttackData>;
export type ServerAttackMessage = BaseMessage<ServerAttackData>;

export type ClientRandomAttackMessage = BaseMessage<ClientRandomAttackData>;
