import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, Plus, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/training-plan', icon: Calendar, label: 'Plan' },
  { path: '/add-workout', icon: Plus, label: 'Hinzufügen', isCenter: true },
  { path: '/buddies', icon: Users, label: 'Buddies' },
  { path: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[428px]">
      <div>
        <div className="glass border-t-0 rounded-t-3xl px-2 pt-2" style={{ background: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              if (item.isCenter) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="relative -mt-6"
                    onClick={() => haptics.selection()}
                  >
                    <div
                      className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300',
                        'gradient-primary gradient-shadow'
                      )}
                    >
                      <Icon
                        className="w-6 h-6 text-gray-900"
                      />
                    </div>
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => haptics.selection()}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                    isActive && 'glass-active'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      isActive
                        ? 'text-[hsl(var(--primary))]'
                        : 'text-[hsl(var(--muted-foreground))]'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs transition-colors duration-200',
                      isActive
                        ? 'text-[hsl(var(--primary))]'
                        : 'text-[hsl(var(--muted-foreground))]'
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
