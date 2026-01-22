"use client"

import { Bell, LogOut, Menu, Settings, User as UserIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, role, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/auth")
  }

  // Helper to format role name (e.g., "farm_manager" -> "Farm Manager")
  const formatRole = (r: string | null) => {
    if (!r) return "User"
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <header className="border-b border-border bg-card/90 sticky top-0 z-20 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="p-2 hover:bg-accent rounded-sm transition-colors md:hidden">
            <Menu size={20} />
          </button>

          {/* Optional: Add Breadcrumbs or Title here for desktop if needed */}
        </div>

        <div className="flex items-center gap-3">
          {/* Role Badge */}
          {role && (
            <Badge variant="outline" className="hidden sm:flex capitalize bg-sidebar-primary">
              {formatRole(role)}
            </Badge>
          )}

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full cursor-pointer">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {/* Mock Notifications */}
                <div className="p-4 text-sm text-center text-muted-foreground">
                  <div className="flex flex-col gap-2 text-left">
                    <div className="py-2 border-b border-border last:border-0 cursor-pointer">
                      <p className="font-medium text-foreground">Low Oxygen Alert</p>
                      <p className="text-xs text-muted-foreground">System A dissolved oxygen fell below 4.0 mg/L.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                    <div className="py-2 border-b border-border last:border-0 cursor-pointer">
                      <p className="font-medium text-foreground">Stocking Recorded</p>
                      <p className="text-xs text-muted-foreground">New batch stocked in Cage 101.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">5 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center text-primary font-medium">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full cursor-pointer">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/01.png" alt={user?.email || "User"} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.email && <p className="font-medium">{user.email}</p>}
                  {role && <p className="w-[200px] truncate text-xs text-muted-foreground">{formatRole(role)}</p>}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
