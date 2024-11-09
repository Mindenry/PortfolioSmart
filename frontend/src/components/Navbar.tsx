import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { Menu, X, LogIn, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Projects', href: '/projects' },
  { name: 'Blog', href: '/blog' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/');
  };

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-background/80 backdrop-blur-md shadow-lg' : 'bg-background'
    }`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex lg:flex-1"
        >
          <Link to="/" className="-m-1.5 p-1.5 relative group">
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-primary to-indigo-600 bg-clip-text text-transparent
              relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-violet-600/20 before:via-primary/20 before:to-indigo-600/20 
              before:blur-lg before:transform before:scale-150 before:-z-10">
              Portfolio
            </span>
            <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-violet-600 via-primary to-indigo-600 
              transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </Link>
        </motion.div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10 transition-all duration-300"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>

        {/* Desktop navigation */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden lg:flex lg:gap-x-8"
        >
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`text-sm font-medium transition-all duration-300 hover:text-primary relative group flex items-center gap-1 ${
                location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.name}
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-violet-600 
                transition-all duration-300 group-hover:w-full ${
                location.pathname === item.href ? 'w-full' : ''
              }`} />
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-all duration-300 hover:text-primary relative group flex items-center gap-1 ${
                location.pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Admin Dashboard
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-violet-600 
                transition-all duration-300 group-hover:w-full ${
                location.pathname === '/admin' ? 'w-full' : ''
              }`} />
            </Link>
          )}
        </motion.div>

        {/* User menu (desktop) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex lg:flex-1 lg:justify-end"
        >
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" 
                  className="flex items-center gap-2 hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10 
                    group transition-all duration-300">
                  <User className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="group-hover:text-primary transition-colors">{user?.username}</span>
                  <ChevronDown className="h-4 w-4 opacity-50 group-hover:text-primary transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 mt-2 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                sideOffset={5}
                alignOffset={0}
              >
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center w-full group">
                    <Settings className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                    <span className="group-hover:text-primary transition-colors">Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="text-destructive cursor-pointer w-full hover:bg-destructive/10 group"
                >
                  <LogOut className="mr-2 h-4 w-4 group-hover:text-destructive transition-colors" />
                  <span className="group-hover:text-destructive transition-colors">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" asChild 
              className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10 group transition-all duration-300">
              <Link to="/login" className="flex items-center gap-2">
                <LogIn className="h-5 w-5 group-hover:text-primary transition-colors" />
                <span className="group-hover:text-primary transition-colors">Login</span>
              </Link>
            </Button>
          )}
        </motion.div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />
            <Dialog.Panel as={motion.div}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background/95 backdrop-blur-md px-6 py-6 sm:max-w-sm border-l border-border"
            >
              <div className="flex items-center justify-between">
                <Link to="/" className="-m-1.5 p-1.5">
                  <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-primary to-indigo-600 bg-clip-text text-transparent">
                    Portfolio
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-border">
                  <div className="space-y-1 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-2 -mx-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-300 ${
                          location.pathname === item.href
                            ? 'bg-gradient-to-r from-primary/20 to-violet-600/20 text-primary'
                            : 'text-muted-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className={`flex items-center gap-2 -mx-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-300 ${
                          location.pathname === '/admin'
                            ? 'bg-gradient-to-r from-primary/20 to-violet-600/20 text-primary'
                            : 'text-muted-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                  </div>
                  <div className="py-6">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-2 px-3 py-2 text-base font-medium text-foreground">
                          <User className="h-5 w-5" />
                          <span>{user?.username}</span>
                        </div>
                        <Link
                          to="/settings"
                          className="flex items-center gap-2 -mx-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground 
                            hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10 group"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5 group-hover:text-primary transition-colors" />
                          <span className="group-hover:text-primary transition-colors">Settings</span>
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 -mx-3 rounded-lg px-3 py-2.5 text-base font-medium text-destructive 
                            hover:bg-destructive/10 group"
                        >
                          <LogOut className="h-5 w-5 group-hover:text-destructive transition-colors" />
                          <span className="group-hover:text-destructive transition-colors">Logout</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        className="flex items-center gap-2 -mx-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground 
                          hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-600/10 group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogIn className="h-5 w-5 group-hover:text-primary transition-colors" />
                        <span className="group-hover:text-primary transition-colors">Login</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Dialog>
        )}
      </AnimatePresence>
    </header>
  );
}