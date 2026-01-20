import { Dumbbell, Activity, User } from 'lucide-react'
import {
    GiChest,
    GiAngelWings,
    GiBiceps,
    GiShoulderArmor,
    GiLeg,
    GiAbdominalArmor,
    GiNeckBite // For Neck?
} from 'react-icons/gi'

// Map category codes to Game Icons
export function getCategoryIcon(category?: string | null) {
    if (!category) return Dumbbell

    switch (category.toLowerCase()) {
        case 'chest':
        case 'chest_muscles':
        case 'brust':
            return GiChest
        case 'back':
        case 'back_muscles':
        case 'rücken':
        case 'lats':
            return GiAngelWings // Represents Lats/Wings
        case 'upper_arms':
        case 'lower_arms':
        case 'arms':
        case 'biceps':
        case 'triceps':
        case 'arme':
            return GiBiceps
        case 'shoulders':
        case 'schultern':
            return GiShoulderArmor
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
            return GiAbdominalArmor
        case 'cardio':
        case 'cardiovascular':
            return Activity
        case 'neck':
        case 'nacken':
            return GiNeckBite // Closest match for neck area or use User
        case 'full_body':
        case 'ganzkörper':
            return User
        default:
            return Dumbbell
    }
}
