import { Dumbbell } from 'lucide-react'
import {
    GiBiceps,
    GiWeightLiftingUp,
    GiLeg
} from 'react-icons/gi'

// Custom SVG Icons matching "Bold Silhouette" style (Standard 24x24 viewBox)

const CustomBackIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // V-Shape Back
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 21L4 6h16L12 21z" /> {/* Triangle */}
        <path d="M4 6l4 3h8l4-3" fill="none" stroke="currentColor" strokeWidth="0.5" />
    </svg>
)

const CustomShoulderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // Head + Broad Shoulders
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <circle cx="12" cy="5" r="3" />
        <path d="M12 9c-5 0-8 2-9 4v7h18v-7c-1-2-4-4-9-4z" />
    </svg>
)

const CustomAbsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // Six Pack Grid
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <rect x="5" y="4" width="6" height="4" rx="1" />
        <rect x="13" y="4" width="6" height="4" rx="1" />
        <rect x="5" y="10" width="6" height="4" rx="1" />
        <rect x="13" y="10" width="6" height="4" rx="1" />
        <rect x="5" y="16" width="6" height="4" rx="1" />
        <rect x="13" y="16" width="6" height="4" rx="1" />
    </svg>
)

const CustomCardioIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // Heart
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
)

const CustomFullBodyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // Standing Man
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <circle cx="12" cy="4" r="2" />
        <path d="M12 21l-3-7-1-8h8l-1 8-3 7z" />
        <path d="M8 7l-2 5M16 7l2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

// Map category codes to Icons
export function getCategoryIcon(category?: string | null) {
    if (!category) return Dumbbell

    switch (category.toLowerCase()) {
        case 'chest':
        case 'chest_muscles':
        case 'brust':
            return GiWeightLiftingUp
        case 'back':
        case 'back_muscles':
        case 'rücken':
        case 'lats':
            return CustomBackIcon
        case 'upper_arms':
        case 'lower_arms':
        case 'arms':
        case 'biceps':
        case 'triceps':
        case 'arme':
            return GiBiceps
        case 'shoulders':
        case 'schultern':
            return CustomShoulderIcon
        case 'upper_legs':
        case 'lower_legs':
        case 'legs':
        case 'calves':
        case 'quads':
        case 'hamstrings':
        case 'beine':
        case 'glutes':
        case 'hips':
            return GiLeg
        case 'waist':
        case 'abs':
        case 'core':
        case 'bauch':
            return CustomAbsIcon
        case 'cardio':
        case 'cardiovascular':
        case 'ausdauer':
            return CustomCardioIcon
        case 'neck':
        case 'nacken':
        case 'full_body':
        case 'ganzkörper':
            return CustomFullBodyIcon
        default:
            return Dumbbell
    }
}
