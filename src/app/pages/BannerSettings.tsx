import { useState, useEffect } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";

interface BannerConfig {
  text: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}

export function BannerSettings() {
  const [banner, setBanner] = useState<BannerConfig>({
    text: "✨ Spring Collection Now Available - Use Code SPRING25 for 25% Off!",
    backgroundColor: "#7A0D19",
    textColor: "#FFFFFF",
    isActive: true
  });
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
    };
  };

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await fetch('/admin/api/settings/banner', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setBanner(data);
            setEditForm(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch banner settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanner();
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    text: banner.text,
    backgroundColor: banner.backgroundColor,
    textColor: banner.textColor
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      text: banner.text,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor
    });
  };

  const handleSave = async () => {
    const updatedBanner = {
      ...banner,
      ...editForm
    };
    
    try {
      const res = await fetch('/admin/api/settings/banner', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedBanner)
      });
      
      if (res.ok) {
        setBanner(updatedBanner);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to save banner settings:", err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      text: banner.text,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor
    });
  };

  const handleToggleActive = async () => {
    const updatedBanner = { ...banner, isActive: !banner.isActive };
    try {
      const res = await fetch('/admin/api/settings/banner', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedBanner)
      });
      
      if (res.ok) {
        setBanner(updatedBanner);
      }
    } catch (err) {
      console.error("Failed to toggle banner active state:", err);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 
          className="text-[#7A0D19]"
          style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: 600,
          }}
        >
          Promotional Banner
        </h1>
        <p className="text-gray-600 mt-2">
          Manage the promotional strip that appears at the top of your website
        </p>
      </div>

      {/* Live Preview */}
      {banner.isActive && (
        <div className="mb-8">
          <h2 
            className="mb-4"
            style={{ 
              fontFamily: 'Playfair Display, serif',
              color: '#7A0D19',
            }}
          >
            Live Preview
          </h2>
          <div 
            className="rounded-xl p-3 text-center text-sm"
            style={{
              backgroundColor: banner.backgroundColor,
              color: banner.textColor,
              boxShadow: '0 4px 12px rgba(122, 13, 25, 0.08)',
            }}
          >
            <p>{banner.text}</p>
          </div>
        </div>
      )}

      {/* Banner Editor */}
      <div 
        className="rounded-2xl p-6"
        style={{
          background: 'white',
          boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
        }}
      >
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label>Banner Text</Label>
              <Input
                value={editForm.text}
                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                className="mt-1 rounded-xl"
                placeholder="Enter promotional message..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={editForm.backgroundColor}
                    onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                    className="w-16 h-9 rounded-xl cursor-pointer"
                  />
                  <Input
                    value={editForm.backgroundColor}
                    onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                    className="flex-1 rounded-xl text-sm"
                    placeholder="#7A0D19"
                  />
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={editForm.textColor}
                    onChange={(e) => setEditForm({ ...editForm, textColor: e.target.value })}
                    className="w-16 h-9 rounded-xl cursor-pointer"
                  />
                  <Input
                    value={editForm.textColor}
                    onChange={(e) => setEditForm({ ...editForm, textColor: e.target.value })}
                    className="flex-1 rounded-xl text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div 
                className="mt-2 p-3 rounded-xl text-center text-sm"
                style={{
                  backgroundColor: editForm.backgroundColor,
                  color: editForm.textColor,
                }}
              >
                {editForm.text || "Your banner text will appear here"}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="rounded-full"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="rounded-full"
                size="sm"
                style={{ background: '#7A0D19', color: 'white' }}
              >
                <Save className="w-3 h-3 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <div 
                className="p-3 rounded-xl text-sm text-center"
                style={{
                  backgroundColor: banner.backgroundColor,
                  color: banner.textColor,
                }}
              >
                <p>{banner.text}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#F2D2D6' }}>
              <div className="flex items-center gap-3">
                <Switch
                  checked={banner.isActive}
                  onCheckedChange={handleToggleActive}
                />
                <span className="text-sm">
                  {banner.isActive ? (
                    <span className="flex items-center gap-2" style={{ color: '#2D7A2D' }}>
                      <Eye className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-500">
                      <EyeOff className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </span>
              </div>

              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-full text-sm transition"
                style={{ background: '#E5B6BB', color: '#7A0D19' }}
              >
                Edit Banner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}