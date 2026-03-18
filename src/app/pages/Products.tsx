import { useState, useEffect } from "react";
import { Plus, Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { BannerEditor } from "../components/BannerEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string[];
  nail_count: 12 | 24;
  has_prep_kit: boolean;
  stock_status: string;
  description: string;
  images: string[];
  whats_included?: string[];
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [apiError, setApiError] = useState("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/admin/api/products', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error fetching products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: ["Featured"] as string[],
    nail_count: 24 as 12 | 24,
    has_prep_kit: true,
    stock_status: "In Stock",
    description: "",
    images: [] as string[],
    whats_included: "",
  });
  
  const handleSave = async () => {
    const productPayload: any = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      nail_count: formData.nail_count,
      has_prep_kit: formData.has_prep_kit,
      stock_status: formData.stock_status,
      description: formData.description,
      images: formData.images,
    };

    // Only save whats_included if the user typed something
    const lines = formData.whats_included.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      productPayload.whats_included = lines;
    } else {
      productPayload.whats_included = null;
    }
    
    try {
      if (editingProduct) {
        const res = await fetch(`/admin/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(productPayload)
        });
        if (!res.ok) throw new Error('Failed to update product');
      } else {
        const res = await fetch('/admin/api/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(productPayload)
        });
        if (!res.ok) throw new Error('Failed to create product');
      }
      
      await fetchProducts();
      setIsOpen(false);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred while saving.');
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: ["Featured"] as string[],
      nail_count: 24 as 12 | 24,
      has_prep_kit: true,
      stock_status: "In Stock",
      description: "",
      images: [] as string[],
      whats_included: "",
    });
    setEditingProduct(null);
  };
  
  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
  };
  
  const executeDelete = async () => {
    if (!productToDelete) return;
    
    try {
      const res = await fetch(`/admin/api/products/${productToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete product');
      await fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting product');
    } finally {
      setProductToDelete(null);
    }
  };
  
  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        category: Array.isArray(product.category) ? product.category : [product.category],
        nail_count: product.nail_count,
        has_prep_kit: product.has_prep_kit,
        stock_status: product.stock_status,
        description: product.description || "",
        images: product.images || [],
        whats_included: (product.whats_included || []).join('\n'),
      });
    }
    setIsOpen(true);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 4 - formData.images.length);
    setIsUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];
      
      for (const file of newFiles) {
        const uploadData = new FormData();
        uploadData.append('image', file);

        const res = await fetch('/admin/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: uploadData,
        });

        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
        const data = await res.json();
        uploadedUrls.push(data.url);
      }

      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ...uploadedUrls] 
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error uploading images');
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  const removeImage = (index: number) => {
    setFormData({ 
      ...formData, 
      images: formData.images.filter((_, i) => i !== index) 
    });
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-[#7A0D19]"
            style={{ 
              fontFamily: 'Playfair Display, serif',
              fontSize: '2.5rem',
              fontWeight: 600,
            }}
          >
            Product Studio
          </h1>
          {apiError && <p className="text-red-500 mt-2">{apiError}</p>}
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-full"
              style={{ 
                background: '#7A0D19',
                color: 'white',
              }}
              onClick={() => openDialog()}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Image Upload */}
              <div>
                <Label>Product Images (Up to 4)</Label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/png, image/jpeg" 
                  className="hidden"
                  id="image-upload"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload">
                  <div 
                    className={`mt-2 border-2 border-dashed rounded-2xl p-8 text-center transition ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FCF9F7]'}`}
                    style={{ borderColor: '#F2D2D6' }}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#7A0D19' }} />
                    <p className="text-sm text-gray-600">
                      {isUploadingImage ? 'Uploading securely to cloud...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB ({formData.images.length}/4)</p>
                  </div>
                </label>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image} 
                          alt={`Upload ${index + 1}`}
                          className="w-full h-20 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                          style={{ background: '#D41919', color: 'white' }}
                          onClick={(e) => {
                            e.preventDefault();
                            removeImage(index);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Floral Pastel"
                    className="mt-1 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label>Price (Rs.)</Label>
                  <Input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="2499"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              
              <div>
                <Label>Categories</Label>
                <div className="mt-2 space-y-2">
                  {["Featured", "New Arrivals", "Premium Bridal Sets", "Archives"].map((cat) => (
                    <label key={cat} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-[#FCF9F7] transition-colors" style={{ border: '1px solid #F2D2D6' }}>
                      <input
                        type="checkbox"
                        checked={formData.category.includes(cat)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, category: [...formData.category, cat] });
                          } else {
                            setFormData({ ...formData, category: formData.category.filter(c => c !== cat) });
                          }
                        }}
                        className="w-4 h-4 accent-[#7A0D19] rounded"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Artisan Details */}
              <div className="space-y-3">
                <Label>Artisan Details</Label>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                  <span className="text-sm">✨ {formData.nail_count} Artisan-painted Nails</span>
                  <Switch 
                    checked={formData.nail_count === 24}
                    onCheckedChange={(checked) => setFormData({ ...formData, nail_count: checked ? 24 : 12 })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                  <span className="text-sm">🎁 Prep Kit Included</span>
                  <Switch 
                    checked={formData.has_prep_kit}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_prep_kit: checked })}
                  />
                </div>
              </div>
              
              {/* Stock Status */}
              <div>
                <Label>Stock Status</Label>
                <Select 
                  value={formData.stock_status} 
                  onValueChange={(value) => setFormData({ ...formData, stock_status: value })}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    <SelectItem value="Made to Order">Made to Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Description */}
              <div>
                <Label>Product Story</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell the story behind this artisan piece..."
                  className="mt-1 rounded-xl min-h-[100px]"
                />
              </div>

              {/* What's Included */}
              <div>
                <Label>What's Included <span className="text-xs text-gray-400 font-normal">(one item per line, leave empty for defaults)</span></Label>
                <Textarea 
                  value={formData.whats_included}
                  onChange={(e) => setFormData({ ...formData, whats_included: e.target.value })}
                  placeholder={"Sets of 24 artisan-painted press-on nails\nProfessional nail glue\nAdhesive sticky tabs\nCuticle pusher & nail file\nAlcohol prep pads"}
                  className="mt-1 rounded-xl min-h-[120px]"
                />
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={isUploadingImage}
                className="w-full rounded-full"
                style={{ background: '#7A0D19' }}
              >
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No products found. Create one to get started!</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div 
            key={product.id}
            className="rounded-2xl p-6 cursor-pointer transition-all hover:translate-y-[-4px]"
            style={{
              background: 'white',
              boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
            }}
            onClick={() => openDialog(product)}
          >
            {/* Product Image Placeholder OR Real Image */}
            <div 
              className="w-full h-48 rounded-xl mb-4 relative flex items-center justify-center group-hover:opacity-90 transition-opacity bg-cover bg-center overflow-hidden"
              style={{ 
                background: product.images && product.images.length > 0 ? `url(${product.images[0]}) center/cover` : '#F2D2D6' 
              }}
            >
              {(!product.images || product.images.length === 0) && (
                <span className="text-4xl">💅</span>
              )}
              <button
                type="button"
                className="absolute top-2 right-2 p-2 rounded-full shadow-sm hover:scale-110 transition-transform"
                style={{ background: 'white', color: '#D41919' }}
                onClick={(e) => confirmDelete(e, product.id)}
                title="Delete Product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h3 
                  style={{ 
                    fontFamily: 'Playfair Display, serif',
                    color: '#7A0D19',
                  }}
                >
                  {product.name}
                </h3>
                <span 
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: product.stock_status === 'In Stock' 
                      ? '#E5F5E5' 
                      : product.stock_status === 'Out of Stock' 
                      ? '#FFE5E5' 
                      : '#F2D2D6',
                    color: product.stock_status === 'In Stock' 
                      ? '#2D7A2D' 
                      : product.stock_status === 'Out of Stock' 
                      ? '#D41919' 
                      : '#7A0D19',
                  }}
                >
                  {product.stock_status}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>✨ {product.nail_count} Nails</span>
                {product.has_prep_kit && <span>🎁 Prep Kit</span>}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#F2D2D6' }}>
                <span 
                  className="text-xl"
                  style={{ 
                    fontFamily: 'Playfair Display, serif',
                    color: '#7A0D19',
                  }}
                >
                  Rs. {product.price}
                </span>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(product.category) ? product.category : [product.category]).map((cat) => (
                    <span 
                      key={cat}
                      className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{ background: '#E5B6BB', color: '#7A0D19' }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#7A0D19' }}>
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone and it will be permanently removed from your database and storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete}
              style={{ background: '#D41919', color: 'white' }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}