import {
  // Navigation & Layout
  IconLayoutDashboard, IconLayoutKanban, IconHome, IconMenu2,
  IconChevronRight, IconChevronLeft, IconArrowLeft, IconArrowRight,
  IconArrowUpRight, IconArrowDownRight, IconArrowsHorizontal, IconArrowsSort,
  IconNavigation,

  // People & Team
  IconUsers, IconUserPlus, IconUserCircle, IconUserSquare, IconUserCog,
  IconUsersGroup,

  // Actions & UI
  IconSearch, IconPlus, IconX, IconCheck, IconPencil, IconCopy,
  IconDownload, IconSettings, IconLogout, IconSelector, IconLoader2,
  IconFilter, IconChevronDown, IconMinus, IconTrash, IconDots,

  // Communication extras
  IconMail, IconLink, IconSend,

  // Status extras
  IconShieldCheck, IconCircleCheck, IconCircleDashed, IconToggleLeft, IconToggleRight,

  // Charts & Data
  IconChartBar, IconChartLine, IconTrendingUp, IconTarget,

  // Files & Docs
  IconFileText, IconNotes, IconReceipt,

  // Commerce & Products
  IconPackage, IconBuildingStore, IconTrophy,

  // Communication
  IconBrandWhatsapp, IconBrandGoogle, IconPhone, IconBell,

  // Status & Alerts
  IconAlertCircle, IconAlertTriangle, IconHistory,
  IconEyeExclamation, IconRefreshAlert, IconFlame, IconInfoCircle,

  // Calendar & Time
  IconCalendar, IconCalendarCheck, IconCalendarEvent,
  IconCalendarOff, IconCalendarPlus, IconClock,

  // Map & Location
  IconMapPin, IconMap2,

  // Theme
  IconMoon, IconSun,

  // Device / Status bar
  IconSignal4g, IconWifi, IconBattery3,

  // Clipboard & Production
  IconClipboardList, IconClipboardCheck,

  // Network
  IconWifiOff,

  // Misc
  IconCamera,

  // Archive / Repository
  IconArchive,
} from '@tabler/icons-react'

const ICON_MAP = {
  // ── Navigation ─────────────────────────────────────
  'layout-dashboard':   IconLayoutDashboard,
  'layout-kanban':      IconLayoutKanban,
  'home':               IconHome,
  'menu-2':             IconMenu2,
  'chevron-right':      IconChevronRight,
  'chevron-left':       IconChevronLeft,
  'arrow-left':         IconArrowLeft,
  'arrow-right':        IconArrowRight,
  'arrow-up-right':     IconArrowUpRight,
  'arrow-down-right':   IconArrowDownRight,
  'arrows-horizontal':  IconArrowsHorizontal,
  'arrows-sort':        IconArrowsSort,
  'navigation':         IconNavigation,

  // ── People ─────────────────────────────────────────
  'users':              IconUsers,
  'user-plus':          IconUserPlus,
  'user-circle':        IconUserCircle,
  'user-square':        IconUserSquare,
  'user-cog':           IconUserCog,
  'users-group':        IconUsersGroup,

  // ── Actions & UI ───────────────────────────────────
  'search':             IconSearch,
  'plus':               IconPlus,
  'minus':              IconMinus,
  'x':                  IconX,
  'check':              IconCheck,
  'pencil':             IconPencil,
  'copy':               IconCopy,
  'download':           IconDownload,
  'settings':           IconSettings,
  'logout':             IconLogout,
  'selector':           IconSelector,
  'loader-2':           IconLoader2,
  'filter':             IconFilter,
  'chevron-down':       IconChevronDown,
  'trash':              IconTrash,
  'dots':               IconDots,

  // ── Communication extras ────────────────────────────
  'mail':               IconMail,
  'link':               IconLink,
  'send':               IconSend,

  // ── Status extras ──────────────────────────────────
  'shield-check':       IconShieldCheck,
  'circle-check':       IconCircleCheck,
  'circle-dashed':      IconCircleDashed,
  'toggle-left':        IconToggleLeft,
  'toggle-right':       IconToggleRight,

  // ── Charts & KPIs ──────────────────────────────────
  'chart-bar':          IconChartBar,
  'chart-line':         IconChartLine,
  'trending-up':        IconTrendingUp,
  'target':             IconTarget,

  // ── Files & Docs ───────────────────────────────────
  'file-text':          IconFileText,
  'notes':              IconNotes,
  'receipt':            IconReceipt,

  // ── Commerce ───────────────────────────────────────
  'package':            IconPackage,
  'building-store':     IconBuildingStore,
  'trophy':             IconTrophy,

  // ── Communication ──────────────────────────────────
  'brand-whatsapp':     IconBrandWhatsapp,
  'brand-google':       IconBrandGoogle,
  'phone':              IconPhone,
  'bell':               IconBell,

  // ── Archive ────────────────────────────────────────
  'archive':            IconArchive,

  // ── Status & Alerts ────────────────────────────────
  'alert-circle':       IconAlertCircle,
  'alert-triangle':     IconAlertTriangle,
  'history':            IconHistory,
  'eye-exclamation':    IconEyeExclamation,
  'refresh-alert':      IconRefreshAlert,
  'flame':              IconFlame,
  'info-circle':        IconInfoCircle,

  // ── Calendar & Time ────────────────────────────────
  'calendar':           IconCalendar,
  'calendar-check':     IconCalendarCheck,
  'calendar-event':     IconCalendarEvent,
  'calendar-off':       IconCalendarOff,
  'calendar-plus':      IconCalendarPlus,
  'clock':              IconClock,

  // ── Map & Location ─────────────────────────────────
  'map-pin':            IconMapPin,
  'map-2':              IconMap2,

  // ── Theme ──────────────────────────────────────────
  'moon':               IconMoon,
  'sun':                IconSun,

  // ── Device / Status bar ────────────────────────────
  'signal-4g':          IconSignal4g,
  'wifi':               IconWifi,
  'battery-3':          IconBattery3,

  // ── Clipboard & Production ──────────────────
  'clipboard-list':     IconClipboardList,
  'clipboard-check':    IconClipboardCheck,

  // ── Network ────────────────────────────────
  'wifi-off':           IconWifiOff,

  // ── Misc ───────────────────────────────────────────
  'camera':             IconCamera,
}

export default function Icon({ name, size = 18, color, style }) {
  const Comp = ICON_MAP[name]
  if (!Comp) {
    if (import.meta.env.DEV) console.warn(`Icon: unknown name "${name}"`)
    return null
  }
  return (
    <Comp
      size={size}
      color={color || 'currentColor'}
      stroke={1.7}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  )
}
