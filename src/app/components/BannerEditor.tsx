import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface BannerEditorProps {
  initialText?: string;
  initialSubtext?: string;
}

export function BannerEditor({ 
  initialText = "Handcrafted Elegance", 
  initialSubtext = "Artisan nail sets designed with love"
}: BannerEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bannerText, setBannerText] = useState(initialText);
  const [bannerSubtext, setBannerSubtext] = useState(initialSubtext);
  const [tempText, setTempText] = useState(bannerText);
  const [tempSubtext, setTempSubtext] = useState(bannerSubtext);
  
  const handleSave = () => {
    setBannerText(tempText);
    setBannerSubtext(tempSubtext);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setTempText(bannerText);
    setTempSubtext(bannerSubtext);
    setIsEditing(false);
  };
  
  return (
    <div 
      className="rounded-2xl p-8 mb-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #7A0D19 0%, #A01525 100%)',
        boxShadow: '0 8px 24px rgba(122, 13, 25, 0.25)',
      }}
    >
      {/* Decorative pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 20px 20px, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      
      <div className="relative">
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div>
              <h2 
                className="text-white mb-2"
                style={{ 
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '2rem',
                  fontWeight: 600,
                }}
              >
                {bannerText}
              </h2>
              <p className="text-white/80">{bannerSubtext}</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="p-3 rounded-full transition-all hover:bg-white/10"
              style={{ color: 'white' }}
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-white/80 text-sm mb-2 block">Banner Title</label>
              <Input
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                placeholder="Enter banner title..."
              />
            </div>
            <div>
              <label className="text-white/80 text-sm mb-2 block">Subtitle</label>
              <Input
                value={tempSubtext}
                onChange={(e) => setTempSubtext(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                placeholder="Enter subtitle..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-full flex items-center gap-2 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-full flex items-center gap-2 transition-all"
                style={{ background: 'white', color: '#7A0D19' }}
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
