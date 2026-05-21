import {
  IconMapPin, IconX, IconUserPlus, IconSettings, IconLogout,
  IconCheck, IconSearch, IconFlame, IconEyeExclamation,
  IconChevronRight, IconChevronLeft, IconAlertTriangle,
  IconAlertCircle, IconBell, IconLayoutKanban, IconArrowsHorizontal,
  IconClock, IconNotes, IconLoader2, IconSelector, IconCalendarCheck,
  IconCalendarEvent, IconCalendarOff, IconPlus, IconUserCircle,
  IconArrowLeft, IconCamera, IconPencil, IconSignal4g, IconWifi,
  IconBattery3, IconBuildingStore, IconBrandWhatsapp, IconPhone,
  IconCalendarPlus, IconRefreshAlert, IconDownload, IconArrowsSort,
  IconNavigation, IconMap2, IconReceipt, IconBrandGoogle,
  IconHome, IconCalendar, IconMenu2, IconUsers, IconTarget,
} from '@tabler/icons-react'

const ICON_MAP = {
  'map-pin':        IconMapPin,
  'x':              IconX,
  'user-plus':      IconUserPlus,
  'settings':       IconSettings,
  'logout':         IconLogout,
  'check':          IconCheck,
  'search':         IconSearch,
  'flame':          IconFlame,
  'eye-exclamation':IconEyeExclamation,
  'chevron-right':  IconChevronRight,
  'chevron-left':   IconChevronLeft,
  'alert-triangle': IconAlertTriangle,
  'alert-circle':   IconAlertCircle,
  'bell':           IconBell,
  'layout-kanban':  IconLayoutKanban,
  'arrows-horizontal': IconArrowsHorizontal,
  'clock':          IconClock,
  'notes':          IconNotes,
  'loader-2':       IconLoader2,
  'selector':       IconSelector,
  'calendar-check': IconCalendarCheck,
  'calendar-event': IconCalendarEvent,
  'calendar-off':   IconCalendarOff,
  'plus':           IconPlus,
  'user-circle':    IconUserCircle,
  'arrow-left':     IconArrowLeft,
  'camera':         IconCamera,
  'pencil':         IconPencil,
  'signal-4g':      IconSignal4g,
  'wifi':           IconWifi,
  'battery-3':      IconBattery3,
  'building-store': IconBuildingStore,
  'brand-whatsapp': IconBrandWhatsapp,
  'phone':          IconPhone,
  'calendar-plus':  IconCalendarPlus,
  'refresh-alert':  IconRefreshAlert,
  'download':       IconDownload,
  'arrows-sort':    IconArrowsSort,
  'navigation':     IconNavigation,
  'map-2':          IconMap2,
  'receipt':        IconReceipt,
  'brand-google':   IconBrandGoogle,
  'home':           IconHome,
  'calendar':       IconCalendar,
  'menu-2':         IconMenu2,
  'users':          IconUsers,
  'target':         IconTarget,
}

export default function Icon({ name, size = 18, color, style }) {
  const Comp = ICON_MAP[name]
  if (!Comp) {
    // Fallback: render nothing but warn in dev
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
