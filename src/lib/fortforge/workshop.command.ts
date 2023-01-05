import type { Pos, Pos2d } from '../utils/geometry'
import { encodePos } from '../utils/geometry'
import type { Label, LabelTile } from './label.js'
import { LabelManagerCommand } from './label.command.js'
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

interface WorkshopGroup {
  name?: string
  hotkey?: string
  children?: string[]
  icon?: typeof ClothIcon
}

interface WorkshopData {
  name: string
  hotkey: string
  impassables: Pos2d[]
  width: number
  height: number
  icon?: typeof ClothIcon
}

export const WORKSHOPGROUPS: WorkshopGroup[] = [
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
export const WORKSHOPSNOGROUP = [
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

export const WORKSHOPS: Record<string, WorkshopData> = {
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
    icon: NestBoxIcon,
    impassables: [],
    width: 1,
    height: 1,
  },
  Hive: {
    name: 'Hive',
    hotkey: 'h',
    icon: HiveIcon,
    impassables: [],
    width: 1,
    height: 1,
  },
}

/*
const Farming = {
  hotkey: 'f',
  children: [
    "Butcher's shop",
    "Tanner's shop",
    "Still",
    "Farmer's Workshop",
    'Fishery',
    'Kitchen',
    'Quern',
    'Nest Box',
  ],
}

const Furnaces = {
  hotkey: 'u',
  children: [
    'Glass Furnaces',
    'Kiln', 
    'Smelter',
  ],
}
*/

export interface Workshop extends Label {
  __workshop__: never
}

function* genWorkshopLabelTiles(
  pos: Pos,
  { width, height, impassables }: WorkshopData
): Iterable<LabelTile> {
  for (let i = 0; i < width; ++i)
    for (let j = 0; j < height; ++j)
      yield {
        pos: <Pos>[pos[0] + i - width * 0.5, pos[1] + j - height * 0.5, pos[2]].map(Math.round),
        passable: !impassables.find(([x, y]) => x === i && y === j),
      }
}

export class WorkshopManagerCommand extends LabelManagerCommand<Workshop> {
  public static readonly WORKSHOPGROUPS: WorkshopGroup[] = WORKSHOPGROUPS
  public static readonly WORKSHOPSNOGROUP: string[] = WORKSHOPSNOGROUP
  public static readonly WORKSHOPS: Record<string, WorkshopData> = WORKSHOPS

  workshopTiles(name: string, pos: Pos): LabelTile[] {
    return [...genWorkshopLabelTiles(pos, WORKSHOPS[name])]
  }
  buildWorkshop(name: string, pos: Pos) {
    const tiles = Object.fromEntries(
      this.workshopTiles(name, pos).map((data) => [encodePos(data.pos), data])
    )
    return this.add({
      name,
      tiles,
    })
  }
}
