import type { Pos, Pos2d, Qube } from './geometry'
import { encodePos, getBoundary } from './geometry.js'
import ClothAndLeatherIcon from '@iconify-icons/mdi/hanger'
import ClothIcon from '@iconify-icons/mdi/tshirt-v'
import LeatherIcon from '@iconify-icons/game-icons/animal-hide'
import DyeIcon from '@iconify-icons/game-icons/abstract-006'
import ForgeIcon from '@iconify-icons/game-icons/anvil'
import SmelterIcon from '@iconify-icons/mdi/wall-fire'
import MasonIcon from '@iconify-icons/game-icons/stone-wall'
import LoomIcon from '@iconify-icons/fluent-emoji-high-contrast/thread'
import FarmerIcon from '@iconify-icons/game-icons/farmer'
import AsheryIcon from '@iconify-icons/game-icons/full-wood-bucket'
import CarpenterIcon from '@iconify-icons/game-icons/wood-pile'
import BowyerIcon from '@iconify-icons/mdi/bow-arrow'
import MechanicIcon from '@iconify-icons/game-icons/gears'
import CraftsIcon from '@iconify-icons/tabler/horse-toy'
import JewelerIcon from '@iconify-icons/mdi/diamond-stone'
import StillIcon from '@iconify-icons/game-icons/barrel'
import SiegeIcon from '@iconify-icons/game-icons/siege-ram'
import ScrewPressIcon from '@iconify-icons/mdi/blender-outline'
import ButcherIcon from '@iconify-icons/mdi/meat'
import TannerIcon from '@iconify-icons/game-icons/animal-hide'
import SoapMakerIcon from '@iconify-icons/game-icons/soap'
import FisheryIcon from '@iconify-icons/game-icons/fishing-lure'
import KitchenIcon from '@iconify-icons/mdi/bug'
import NestBoxIcon from '@iconify-icons/game-icons/nest-eggs'
import HiveIcon from '@iconify-icons/game-icons/tree-beehive'
import VerminIcon from '@iconify-icons/mdi/bug'
import BallistaIcon from '@iconify-icons/game-icons/ballista'
import CatapultIcon from '@iconify-icons/game-icons/catapult'
import TradeIcon from '@iconify-icons/game-icons/trade'

interface WorkshopGroup {
  name: string
  hotkey: string
  children: string[]
  icon?: typeof ClothIcon
}

export interface Building {
  name: string
  hotkey?: string
  glyph?: string
  width?: number
  height?: number
  impassables?: Pos2d[]
  rectangle?: 'tiles' | 'building'
  color?: string
  icon?: typeof ClothIcon
}

export interface BuildGroup {
  name: string
  hotkey?: string
  icon?: typeof ClothIcon
  children: BuildEntry[]
}

export type BuildEntry = BuildGroup | Building

const workshopGroups: WorkshopGroup[] = [
  {
    name: 'Cloth/Leather',
    hotkey: 'l',
    icon: ClothAndLeatherIcon,
    children: ['Leather Works', 'Loom', 'Clothier', 'Dyer'],
  },
  {
    name: 'Farming',
    hotkey: 'f',
    icon: FarmerIcon,
    children: [
      'Still',
      'Butcher',
      'Tanner',
      'Fishery',
      'Kitchen',
      'Farmer',
      'Quern',
      'Vermin Catcher',
      'Nest Box',
      'Hive',
    ],
  },
  {
    name: 'Furnaces',
    hotkey: 'u',
    icon: SmelterIcon,
    children: ['Glass furnace', 'Kiln', 'Smelter', 'Wood furnace'],
  },
]
const ungroupedWorkshops = [
  'Ashery',
  'Bowyer',
  'Carpenter',
  'Crafts',
  'Jeweler',
  'Mechanic',
  'Metalsmith',
  'Screw Press',
  'Siege',
  'Soap Maker',
  'Stoneworker',
]

export const WORKSHOPS: Record<string, Building> = {
  /***************  Clothing and Leather  **********************/
  'Leather Works': {
    name: 'Leather Works',
    hotkey: 'l',
    icon: LeatherIcon,
    impassables: [
      [2, 0],
      [0, 1],
      [2, 2],
    ],
    width: 3,
    height: 3,
  },
  Loom: {
    name: 'Loom',
    hotkey: 'o',
    icon: LoomIcon,
    impassables: [[1, 0]],
    width: 3,
    height: 3,
  },
  Clothier: {
    name: 'Clothier',
    hotkey: 'k',
    icon: ClothIcon,
    impassables: [
      [0, 0],
      [1, 2],
    ],
    width: 3,
    height: 3,
  },
  Dyer: {
    name: 'Dyer',
    hotkey: 'y',
    icon: DyeIcon,
    impassables: [
      [1, 0],
      [0, 2],
      [2, 2],
    ],
    width: 3,
    height: 3,
  },
  /***************  Furnaces  **********************/
  'Glass furnace': {
    name: 'Glass furnace',
    hotkey: 'g',
    icon: SmelterIcon,
    impassables: [[1, 0]],
    width: 3,
    height: 3,
  },
  Kiln: {
    name: 'Kiln',
    hotkey: 'k',
    icon: SmelterIcon,
    impassables: [[1, 0]],
    width: 3,
    height: 3,
  },
  Smelter: {
    name: 'Smelter',
    hotkey: 'l',
    icon: SmelterIcon,
    impassables: [[1, 0]],
    width: 3,
    height: 3,
  },
  'Wood furnace': {
    name: 'Wood furnace',
    hotkey: 'f',
    icon: SmelterIcon,
    impassables: [[1, 0]],
    width: 3,
    height: 3,
  },
  /***************  Default  **********************/
  Ashery: {
    name: 'Ashery',
    hotkey: 'y',
    icon: AsheryIcon,
    impassables: [
      [1, 0],
      [0, 2],
    ],
    width: 3,
    height: 3,
  },
  Bowyer: {
    name: 'Bowyer',
    hotkey: 'b',
    icon: BowyerIcon,
    impassables: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    width: 3,
    height: 3,
  },
  Carpenter: {
    name: 'Carpenter',
    hotkey: 'p',
    icon: CarpenterIcon,
    impassables: [
      [0, 1],
      [0, 2],
      [2, 2],
    ],
    width: 3,
    height: 3,
  },
  Crafts: {
    name: 'Crafts',
    hotkey: 'r',
    icon: CraftsIcon,
    impassables: [
      [2, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    width: 3,
    height: 3,
  },
  Jeweler: {
    name: 'Jeweler',
    hotkey: 'j',
    icon: JewelerIcon,
    impassables: [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    width: 3,
    height: 3,
  },
  Mechanic: {
    name: 'Mechanic',
    hotkey: 'h',
    icon: MechanicIcon,
    impassables: [[2, 1]],
    width: 3,
    height: 3,
  },
  Metalsmith: {
    name: 'Metalsmith',
    hotkey: 'i',
    icon: ForgeIcon,
    impassables: [
      [0, 1],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  'Screw Press': {
    name: 'Screw Press',
    hotkey: 'R',
    glyph: '╧',
    icon: ScrewPressIcon,
    impassables: [],
    width: 1,
    height: 1,
  },
  Siege: {
    name: 'Siege',
    hotkey: 'g',
    icon: SiegeIcon,
    impassables: [
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
    width: 5,
    height: 5,
  },
  'Soap Maker': {
    name: 'Soap Maker',
    hotkey: 'P',
    icon: SoapMakerIcon,
    impassables: [
      [2, 0],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  Stoneworker: {
    name: 'Stoneworker',
    hotkey: 't',
    icon: MasonIcon,
    impassables: [
      [2, 0],
      [0, 1],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  /***************  Farming  **********************/
  Still: {
    name: 'Still',
    hotkey: 'l',
    icon: StillIcon,
    impassables: [[0, 0]],
    width: 3,
    height: 3,
  },
  Butcher: {
    name: 'Butcher',
    hotkey: 'b',
    icon: ButcherIcon,
    impassables: [
      [2, 0],
      [0, 1],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  Tanner: {
    name: 'Tanner',
    hotkey: 't',
    icon: TannerIcon,
    impassables: [
      [0, 0],
      [2, 1],
      [0, 2],
    ],
    width: 3,
    height: 3,
  },
  Fishery: {
    name: 'Fishery',
    hotkey: 'y',
    icon: FisheryIcon,
    impassables: [
      [0, 0],
      [0, 1],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  Kitchen: {
    name: 'Kitchen',
    hotkey: 'k',
    icon: KitchenIcon,
    impassables: [
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    width: 3,
    height: 3,
  },
  Farmer: {
    name: 'Farmer',
    hotkey: 'f',
    icon: FarmerIcon,
    impassables: [
      [1, 0],
      [0, 2],
    ],
    width: 3,
    height: 3,
  },
  Quern: {
    name: 'Quern',
    hotkey: 'q',
    glyph: '○',
    impassables: [],
    width: 1,
    height: 1,
  },
  'Vermin Catcher': {
    name: 'Vermin Catcher',
    hotkey: 'v',
    icon: VerminIcon,
    impassables: [],
    width: 5,
    height: 5,
  },
  'Nest Box': {
    name: 'Nest Box',
    hotkey: 'n',
    glyph: '◘',
    icon: NestBoxIcon,
    impassables: [],
    width: 1,
    height: 1,
  },
  Hive: {
    name: 'Hive',
    hotkey: 'h',
    glyph: '▬',
    icon: HiveIcon,
    impassables: [],
    width: 1,
    height: 1,
  },
}

// Classic glyphs from https://dwarffortresswiki.org/index.php/Tilesets
const furniture: Building[] = [
  { name: 'Bed', hotkey: 'b', glyph: 'Θ' },
  { name: 'Chair', hotkey: 'r', glyph: '╥' },
  { name: 'Table', hotkey: 't', glyph: '╤' },
  { name: 'Chest', hotkey: 'h', glyph: 'Æ' },
  { name: 'Cabinet', hotkey: 'n', glyph: 'π' },
  { name: 'Burial', hotkey: 'x', glyph: '0' },
  { name: 'Slab', hotkey: 'l', glyph: '∩' },
  { name: 'Statue', hotkey: 'u', glyph: 'Ω' },
  { name: 'Traction bench', hotkey: 'T', glyph: 'Φ' },
  { name: 'Bookcase', hotkey: 'o', glyph: '≡' },
  { name: 'Instrument', hotkey: 'i', glyph: '¿' },
  { name: 'Display', hotkey: 'y', glyph: 'ï' },
]

const constructions: Building[] = [
  { name: 'Wall', hotkey: 'l', glyph: '═', rectangle: 'tiles', color: '#e8c99a' },
  { name: 'Floor', hotkey: 'f', glyph: '+', rectangle: 'tiles', color: '#e8c99a' },
  { name: 'Ramp', hotkey: 'r', glyph: '▲', rectangle: 'tiles', color: '#ffbf58' },
  { name: 'Stairs', hotkey: 't', glyph: 'X', rectangle: 'tiles', color: '#ffbf58' },
  { name: 'Bridge', hotkey: 'b', glyph: '╬', rectangle: 'building', color: '#dba97a' },
  { name: 'Paved road', hotkey: 'o', glyph: '+', rectangle: 'building', color: '#aad3cc' },
  { name: 'Dirt road', hotkey: 'O', glyph: '~', rectangle: 'building', color: '#d5a27d' },
  { name: 'Fortification', hotkey: 'F', glyph: '╬', rectangle: 'tiles', color: '#e8c99a' },
  { name: 'Wall grate', hotkey: 'G', glyph: '╫' },
  { name: 'Floor grate', hotkey: 'g', glyph: '#' },
]

const military: Building[] = [
  { name: 'Archery target', hotkey: 't', glyph: 'X' },
  { name: 'Weapon rack', hotkey: 'r', glyph: '√' },
  { name: 'Armor stand', hotkey: 'n', glyph: '♫' },
  { name: 'Ballista', hotkey: 'b', width: 3, height: 3, icon: BallistaIcon },
  { name: 'Catapult', hotkey: 'p', width: 3, height: 3, icon: CatapultIcon },
  { name: 'Bolt thrower', glyph: 'ô' },
]

const tradeDepot: Building = {
  name: 'Trade depot',
  hotkey: 'T',
  width: 5,
  height: 5,
  // Classic floor plan: https://dwarffortresswiki.org/index.php/Template:Floor_Plan_Trade_depot
  impassables: [],
  icon: TradeIcon,
}

export const BUILD_MENU: BuildGroup = {
  name: 'Build',
  children: [
    {
      name: 'Workshops',
      hotkey: 'o',
      children: [
        ...workshopGroups.map((group) => ({
          ...group,
          children: group.children.map((name) => WORKSHOPS[name]),
        })),
        ...ungroupedWorkshops.map((name) => WORKSHOPS[name]),
      ],
    },
    { name: 'Furniture', hotkey: 'f', children: furniture },
    { name: 'Constructions', hotkey: 'n', children: constructions },
    { name: 'Military', hotkey: 'y', children: military },
    tradeDepot,
  ],
}

export const BUILDINGS = new Map(
  [...Object.values(WORKSHOPS), ...furniture, ...constructions, ...military, tradeDepot].map(
    (building) => [building.name, building]
  )
)

export function buildingFootprint(building: Building, cursor: Pos, corner?: Pos): Qube {
  if (building.rectangle && corner) return getBoundary([corner, cursor])
  const { width = 1, height = 1 } = building
  return [
    cursor[0] - Math.floor(width / 2),
    cursor[1] - Math.floor(height / 2),
    cursor[2],
    width - 1,
    height - 1,
    0,
  ]
}

// Indexed by neighbors to the north (1), east (2), south (4), and west (8).
const wallConnections = 'O║═╚║║╔╠═╝═╩╗╣╦╬'

function wallGlyph([x, y, z]: Pos, walls: ReadonlySet<string>): string {
  const north = walls.has(encodePos([x, y - 1, z]))
  const east = walls.has(encodePos([x + 1, y, z]))
  const south = walls.has(encodePos([x, y + 1, z]))
  const west = walls.has(encodePos([x - 1, y, z]))
  return wallConnections[Number(north) + 2 * Number(east) + 4 * Number(south) + 8 * Number(west)]
}

function bridgeGlyph([x, y]: Pos, [left, top, , w, h]: Qube): string {
  if (w === 0 && h === 0) return '+'
  const column = x === left ? 0 : x === left + w ? 2 : 1
  const row = y === top ? 0 : y === top + h ? 2 : 1
  if (h === 0) return '╞═╡'[column]
  if (w === 0) return '╥║╨'[row]
  return ['╔═╗', '║+║', '╚═╝'][row][column]
}

export function buildingGlyph(
  building: Building,
  pos: Pos,
  area: Qube,
  walls: ReadonlySet<string>
) {
  if (building.name === 'Wall') return wallGlyph(pos, walls)
  if (building.name === 'Bridge') return bridgeGlyph(pos, area)
  return building.glyph ?? ''
}
