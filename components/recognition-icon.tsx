import {
  Activity, ArrowLeftRight, Ban, Brain, BrickWall, CircleDashed, Crown,
  Dices, Dna, Eye, Footprints, Gauge, Ghost, Glasses, Handshake, LockKeyhole,
  Magnet, Music2, Orbit, Puzzle, Rocket, Shield, ShieldCheck, ShoppingCart,
  SlidersHorizontal, Snowflake, Sparkles, Swords, Target, Telescope, Theater,
  TrafficCone, TrendingDown, WandSparkles, Wheat, Zap, type LucideIcon,
} from 'lucide-react';

// Keep the stored distinctions intact; render their symbols in the HUD icon style.
const icons: Record<string, LucideIcon> = {
  '↔️': ArrowLeftRight, '⚔️': Swords, '⚡': Zap, '⛔': Ban, '✈️': Rocket,
  '🌌': Orbit, '🌾': Wheat, '🎛️': SlidersHorizontal, '🎭': Theater,
  '🎯': Target, '🎰': Dices, '🎲': Dices, '🎼': Music2, '🏎️': Gauge,
  '🐊': Target, '👑': Crown, '👓': Glasses, '👟': Footprints, '👹': Shield,
  '👻': Ghost, '💥': Zap, '📉': TrendingDown, '🔐': LockKeyhole,
  '🔒': LockKeyhole, '🔭': Telescope, '🕵️': Eye, '🕺': Activity,
  '😈': Zap, '🚀': Rocket, '🚔': Ban, '🚧': TrafficCone, '🛑': Ban,
  '🛒': ShoppingCart, '🛡️': Shield, '🤝': Handshake, '🤫': Eye,
  '🥴': CircleDashed, '🥷': Eye, '🦅': Footprints, '🧊': Snowflake,
  '🧠': Brain, '🧩': Puzzle, '🧬': Dna, '🧱': BrickWall, '🧲': Magnet,
  '🧹': Sparkles, '🧼': Sparkles, '🪄': WandSparkles, '🫡': ShieldCheck,
  '🫥': Ghost,
};

export function RecognitionIcon({icon}:{icon:string}) {
  const Icon = icons[icon] ?? Shield;
  return <Icon aria-hidden="true" strokeWidth={1.5}/>;
}
