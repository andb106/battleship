import { ClientAttackData, Positions, Ship } from './models';

export const generateShipCellsPositions = (ship: Ship) => {
  const resPositions: Positions[] = [];
  if (ship.direction) {
    for (let i = 0; i < ship.length; i++) {
      resPositions.push({ x: ship.position.x, y: ship.position.y + i });
    }
  } else {
    for (let i = 0; i < ship.length; i++) {
      resPositions.push({ x: ship.position.x + i, y: ship.position.y });
    }
  }
  return resPositions;
};

export const generateEmptyCellsAroundShip = (ship: Ship) => {
  const resPositions: Positions[] = [];
  if (ship.direction) {
    for (let i = 0; i < ship.length + 2; i++) {
      resPositions.push({ x: ship.position.x - 1, y: ship.position.y - 1 + i });
    }
    for (let i = 0; i < ship.length + 2; i++) {
      resPositions.push({ x: ship.position.x + 1, y: ship.position.y - 1 + i });
    }
    resPositions.push({ x: ship.position.x, y: ship.position.y - 1 });
    resPositions.push({ x: ship.position.x, y: ship.position.y + ship.length });
  } else {
    for (let i = 0; i < ship.length + 2; i++) {
      resPositions.push({ x: ship.position.x - 1 + i, y: ship.position.y - 1 });
    }
    for (let i = 0; i < ship.length + 2; i++) {
      resPositions.push({ x: ship.position.x - 1 + i, y: ship.position.y + 1 });
    }
    resPositions.push({ x: ship.position.x - 1, y: ship.position.y });
    resPositions.push({ x: ship.position.x + ship.length, y: ship.position.y });
  }
  return resPositions.filter(
    ({ x, y }) => 0 <= x && x < 10 && 0 <= y && y < 10,
  );
};

interface CheckAttack {
  status: 'miss' | 'shot' | 'killed';
  ship?: Ship;
}

export const checkAttack = (
  ships: Ship[] | undefined,
  attackData: ClientAttackData,
): CheckAttack => {
  let status: 'miss' | 'shot' | 'killed' = 'miss';
  if (!ships) return { status };
  for (const ship of ships) {
    if (ship.direction) {
      for (let i = 0; i < ship.length; i++) {
        if (
          ship.position.x === attackData.x &&
          ship.position.y + i === attackData.y
        ) {
          ship.countShots += 1;
          status = ship.countShots === ship.length ? 'killed' : 'shot';
          return { status, ship };
        }
      }
    } else {
      for (let i = 0; i < ship.length; i++) {
        if (
          ship.position.x + i === attackData.x &&
          ship.position.y === attackData.y
        ) {
          ship.countShots += 1;
          status = ship.countShots === ship.length ? 'killed' : 'shot';
          return { status, ship };
        }
      }
    }
  }
  return { status };
};
