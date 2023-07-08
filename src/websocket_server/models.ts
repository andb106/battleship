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

export type ClientRegMessage = BaseMessage<ClientRegData>;
export type ServerRegMessage = BaseMessage<ServerRegData>;
