import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      // The API proxy will forward this to the Express backend (port 3001)
      const response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("adminToken", data.token); // Store the JWT
        navigate("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: 'linear-gradient(135deg, #7A0D19 0%, #E5B6BB 100%)',
        fontFamily: 'Poppins, sans-serif'
      }}
    >
      <div 
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'rgba(252, 249, 247, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(122, 13, 25, 0.3)',
        }}
      >
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div 
            className="w-20 h-20 rounded-xl flex items-center justify-center mb-4 overflow-hidden"
            style={{
              background: 'white',
              boxShadow: '0 4px 12px rgba(229, 182, 187, 0.3)',
            }}
          >
            <Sparkles className="w-10 h-10 text-[#7A0D19]" />
          </div>
          <h1 
            className="text-center"
            style={{ 
              fontFamily: 'Playfair Display, serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#7A0D19',
              letterSpacing: '0.5px',
            }}
          >
            nailsbyhamno
          </h1>
          <p 
            className="text-sm mt-1"
            style={{ color: '#7A0D19', opacity: 0.7 }}
          >
            Studio Management Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label htmlFor="email" className="text-[#7A0D19]">Email</Label>
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="mt-1 rounded-xl"
              placeholder="Enter admin email"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-[#7A0D19]">Password</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="mt-1 rounded-xl"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div 
              className="p-3 rounded-xl text-sm text-center"
              style={{ background: '#FFE5E5', color: '#D41919' }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full py-6 text-base"
            style={{ background: '#7A0D19', color: 'white' }}
          >
            Sign In
          </Button>

          <div className="text-center text-xs text-gray-500 mt-4">
            Only designated administrators may log in.
          </div>
        </form>
      </div>
    </div>
  );
}
