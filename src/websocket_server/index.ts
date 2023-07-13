import WebSocket, { WebSocketServer } from 'ws';
import {
  BaseMessage,
  ClientAddShipsMessage,
  ClientAttackMessage,
  ServerAttackMessage,
  ServerRegMessage,
  Ship,
} from './models';
import {
  checkAttack,
  generateEmptyCellsAroundShip,
  generateShipCellsPositions,
} from './utils';

const WSS_PORT = 3000;

interface PlayerData {
  id: number;
  password: string;
  name: string;
}

interface RoomData {
  roomId: number;
  roomUsers: {
    name: string | undefined;
    index: number | undefined;
  }[];
}

interface GamePlayer {
  id: number;
  ws: WebSocket;
  ships: Ship[];
  alreadyAttackedCells?: Set<string>;
}

interface Game {
  gameId: number;
  gamePlayers: GamePlayer[];
  currentTurn?: number;
}

const GamesStorage: Game[] = [];

let INITIAL_PLAYER_INDEX = 0;
let INITIAL_ROOM_INDEX = 100;

const users: Map<WebSocket, PlayerData> = new Map();

const roomsStorage: RoomData[] = [];

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start websocket server on the ${WSS_PORT} port!`);

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const parsedMessage = JSON.parse(data.toString());
    const typeMessage = parsedMessage.type;

    console.log('data from frontend -->', parsedMessage);

    const updatedRooms = {
      type: 'update_room',
      data: roomsStorage,
      id: 0,
    };

    switch (typeMessage) {
      case 'reg':
        const name = JSON.parse(parsedMessage.data).name;
        const password = JSON.parse(parsedMessage.data).password;

        const playerData = { id: ++INITIAL_PLAYER_INDEX, password, name };

        users.set(ws, playerData);

        const regDataTest: ServerRegMessage = {
          type: 'reg',
          data: {
            name: playerData.name,
            index: playerData.id,
            error: false,
            errorText: '',
          },
          id: 0,
        };

        ws.send(messageToJsonString(regDataTest));
        break;

      case 'create_room':
        const newRoom = {
          roomId: ++INITIAL_ROOM_INDEX,
          roomUsers: [
            {
              name: users.get(ws)?.name,
              index: users.get(ws)?.id,
            },
          ],
        };

        roomsStorage.push(newRoom);

        // update rooms

        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageToJsonString(updatedRooms));
          }
        });

        break;

      case 'add_user_to_room':
        const roomIdFromMessage = JSON.parse(parsedMessage.data).indexRoom;

        // create game

        const roomIndexForGame = roomsStorage.findIndex(
          (room) => room.roomId === roomIdFromMessage,
        );

        const roomUserId = roomsStorage[roomIndexForGame]?.roomUsers[0]?.index;

        const currentUserId = users.get(ws)?.id;

        const createGameForCurrentUser = {
          type: 'create_game',
          data: {
            idGame: roomIdFromMessage,
            idPlayer: currentUserId,
          },
          id: 0,
        };

        const createGameForRoomUser = {
          type: 'create_game',
          data: {
            idGame: roomIdFromMessage,
            idPlayer: roomUserId,
          },
          id: 0,
        };

        if (currentUserId !== roomUserId) {
          ws.send(messageToJsonString(createGameForCurrentUser));
          users.forEach((value, key) => {
            if (value.id === roomUserId) {
              key.send(messageToJsonString(createGameForRoomUser));
            }
          });

          // update rooms
          roomsStorage.splice(roomIndexForGame, 1);
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(messageToJsonString(updatedRooms));
            }
          });
        }

        break;

      case 'add_ships':
        const clientMessage: ClientAddShipsMessage =
          messageToJson(parsedMessage);

        const playerShips = clientMessage.data.ships;

        //add shots counter
        playerShips.forEach((ship) => (ship.countShots = 0));

        const gamePlayer: GamePlayer = {
          id: clientMessage.data.indexPlayer,
          ships: clientMessage.data.ships,
          ws,
          alreadyAttackedCells: new Set(),
        };

        const gameIndex = GamesStorage.findIndex(
          (game) => game.gameId === clientMessage.data.gameId,
        );

        if (gameIndex === -1) {
          const newGame: Game = {
            gameId: clientMessage.data.gameId,
            gamePlayers: [gamePlayer],
            currentTurn: gamePlayer.id,
          };
          GamesStorage.push(newGame);
        } else {
          GamesStorage.forEach((game) => {
            if (game.gameId === clientMessage.data.gameId) {
              game.gamePlayers.push(gamePlayer);

              if (game.gamePlayers.length === 2) {
                // send start game and turn
                const turnDataToSend = {
                  type: 'turn',
                  data: {
                    currentPlayer: game.currentTurn,
                  },
                  id: 0,
                };

                game.gamePlayers.forEach((player) => {
                  const gameDataToSend = {
                    type: 'start_game',
                    data: player.ships,
                    currentPlayerIndex: player.id,
                    id: 0,
                  };
                  player.ws.send(messageToJsonString(gameDataToSend));
                  player.ws.send(messageToJsonString(turnDataToSend));
                });
              }
            }
          });
        }

        break;

      case 'attack':
      case 'randomAttack':
        const clientAttackMessage: ClientAttackMessage =
          messageToJson(parsedMessage);

        if (
          clientAttackMessage.data.x === undefined &&
          clientAttackMessage.data.y === undefined
        ) {
          clientAttackMessage.data.x = Math.floor(Math.random() * 10);
          clientAttackMessage.data.y = Math.floor(Math.random() * 10);
        }

        const currentGame = GamesStorage.find(
          (game) => game.gameId === clientAttackMessage.data.gameId,
        );

        const attackingPlayer = currentGame?.gamePlayers.find(
          (player) => player.id === clientAttackMessage.data.indexPlayer,
        );

        // break if not your turn;
        if (attackingPlayer?.id !== currentGame?.currentTurn) break;

        const isAlreadyAttacked = attackingPlayer?.alreadyAttackedCells?.has(
          JSON.stringify({
            x: clientAttackMessage.data.x,
            y: clientAttackMessage.data.y,
          }),
        );

        if (isAlreadyAttacked) {
          const turnDataToSend = {
            type: 'turn',
            data: {
              currentPlayer: currentGame?.currentTurn,
            },
            id: 0,
          };
          attackingPlayer?.ws.send(messageToJsonString(turnDataToSend));
          break;
        }

        attackingPlayer?.alreadyAttackedCells?.add(
          JSON.stringify({
            x: clientAttackMessage.data.x,
            y: clientAttackMessage.data.y,
          }),
        );

        const enemyPlayer = currentGame?.gamePlayers.find(
          (player) => player.id !== clientAttackMessage.data.indexPlayer,
        );

        const enemyShips = enemyPlayer?.ships;

        const statusAttack = checkAttack(enemyShips, clientAttackMessage.data);

        if (currentGame && statusAttack.status === 'miss') {
          currentGame.currentTurn = enemyPlayer?.id;
        }

        const turnDataToSend = {
          type: 'turn',
          data: {
            currentPlayer: currentGame?.currentTurn,
          },
          id: 0,
        };

        const attackDataToSend: ServerAttackMessage = {
          type: 'attack',
          data: {
            currentPlayer: clientAttackMessage.data.indexPlayer,
            position: {
              x: clientAttackMessage.data.x,
              y: clientAttackMessage.data.y,
            },
            status: statusAttack.status,
          },
          id: 0,
        };

        // send attack from server to every player in the game
        currentGame?.gamePlayers.forEach((player) => {
          if (statusAttack.status === 'killed' && statusAttack.ship) {
            const killedCellsPositions = generateShipCellsPositions(
              statusAttack.ship,
            );
            killedCellsPositions.forEach((cellPositions) => {
              const attackDataToSend: ServerAttackMessage = {
                type: 'attack',
                data: {
                  currentPlayer: clientAttackMessage.data.indexPlayer,
                  position: cellPositions,
                  status: statusAttack.status,
                },
                id: 0,
              };
              player.ws.send(messageToJsonString(attackDataToSend));
              player.ws.send(messageToJsonString(turnDataToSend));
            });

            const emptyCells = generateEmptyCellsAroundShip(statusAttack.ship);
            emptyCells.forEach((cell) => {
              // add cell to alreadyAttacked set
              attackingPlayer?.alreadyAttackedCells?.add(JSON.stringify(cell));

              const attackDataToSend: ServerAttackMessage = {
                type: 'attack',
                data: {
                  currentPlayer: clientAttackMessage.data.indexPlayer,
                  position: cell,
                  status: 'miss',
                },
                id: 0,
              };
              player.ws.send(messageToJsonString(attackDataToSend));
              player.ws.send(messageToJsonString(turnDataToSend));
            });
          } else {
            player.ws.send(messageToJsonString(attackDataToSend));
            player.ws.send(messageToJsonString(turnDataToSend));
          }
        });

        break;

      default:
        break;
    }
  });
});

function messageToJsonString(message: BaseMessage<unknown>) {
  const fieldDataToJsonString = JSON.stringify(message.data);
  return JSON.stringify({ ...message, data: fieldDataToJsonString });
}

function messageToJson(message: BaseMessage<string>) {
  const fieldDataToJson = JSON.parse(message.data);
  return { ...message, data: fieldDataToJson };
}
