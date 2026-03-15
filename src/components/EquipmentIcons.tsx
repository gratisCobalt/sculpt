/* eslint-disable react-refresh/only-export-components */
import { Dumbbell, type LucideProps } from 'lucide-react'

// Custom Equipment Icons as SVG components
export function BarbellIcon(props: LucideProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Barbell icon */}
            <rect x="2" y="9" width="3" height="6" rx="0.5" />
            <rect x="19" y="9" width="3" height="6" rx="0.5" />
            <rect x="5" y="10" width="2" height="4" rx="0.5" />
            <rect x="17" y="10" width="2" height="4" rx="0.5" />
            <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
    )
}

export function CableIcon(props: LucideProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Cable machine icon */}
            <rect x="4" y="2" width="16" height="4" rx="1" />
            <line x1="12" y1="6" x2="12" y2="14" />
            <circle cx="12" cy="17" r="3" />
            <line x1="12" y1="14" x2="12" y2="14" strokeWidth="3" />
        </svg>
    )
}

export function BodyweightIcon(props: LucideProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Person/bodyweight icon */}
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="15" />
            <line x1="8" y1="11" x2="16" y2="11" />
            <line x1="12" y1="15" x2="8" y2="22" />
            <line x1="12" y1="15" x2="16" y2="22" />
        </svg>
    )
}

export function MachineIcon(props: LucideProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Machine/gear icon */}
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="16" />
            <line x1="8" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="16" y2="12" />
        </svg>
    )
}

export function KettlebellIcon(props: LucideProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Kettlebell icon */}
            <path d="M9 4a3 3 0 0 1 6 0v2H9V4z" />
            <ellipse cx="12" cy="14" rx="6" ry="7" />
        </svg>
    )
}

// Map equipment codes to icons
export function getEquipmentIcon(equipment?: string) {
    switch (equipment?.toLowerCase()) {
        case 'barbell':
        case 'ez_barbell':
        case 'olympic_barbell':
            return BarbellIcon
        case 'dumbbell':
            return Dumbbell
        case 'cable':
            return CableIcon
        case 'body_weight':
        case 'bodyweight':
        case 'assisted':
            return BodyweightIcon
        case 'kettlebell':
            return KettlebellIcon
        case 'leverage_machine':
        case 'smith_machine':
        case 'sled_machine':
        case 'band':
        case 'resistance_band':
        default:
            return MachineIcon
    }
}
