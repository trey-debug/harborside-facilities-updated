import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthPageProps {
  onLogin: () => void;
}

export const AuthPage = ({ onLogin }: AuthPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
        onLogin();
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-soft-gradient -z-10" />

      <main className="w-full max-w-[440px]">
        <div className="bg-white shadow-2xl rounded-xl overflow-hidden border border-primary/10">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-4xl">church</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Welcome Back</h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[280px]">
                Please enter your details to manage church facilities.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">Email Address</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors duration-200">mail</span>
                  </div>
                  <Input
                    id="email" type="email" placeholder="e.g. admin@churchname.org"
                    value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)}
                    required disabled={isLoading}
                    className="pl-11 py-3.5 bg-gray-50 border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="password">Password</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors duration-200">lock</span>
                  </div>
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                    value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)}
                    required disabled={isLoading}
                    className="pl-11 pr-12 py-3.5 bg-gray-50 border-gray-200 rounded-lg text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}
                className="w-full primary-gradient text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all">
                {isLoading ? (
                  <><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Signing in...</>
                ) : (
                  <>Sign In<span className="material-symbols-outlined text-xl ml-2">login</span></>
                )}
              </Button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-sm text-gray-500">
                First time here? <span className="text-primary font-bold">Contact administrator</span>
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full primary-gradient opacity-80" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-60">
            <span className="material-symbols-outlined text-gray-900 text-[20px]">church</span>
            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Church Facilities Manager</span>
          </div>
        </div>
      </main>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20 -z-20 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
      </div>
    </div>
  );
};
