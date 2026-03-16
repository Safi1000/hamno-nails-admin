import { useState, useEffect } from "react";
import { Search, Phone, Mail, ShoppingBag, Star, Crown, Edit2, X, Trash2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "../components/ui/alert-dialog";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  lifetimeValue: number;
  orderHistory: {
    orderId: string;
    date: string;
    total: number;
  }[];
  specialNotes: string;
  tags: string[];
}

const VIP_ORDER_THRESHOLD = 5; // Customer becomes VIP automatically at 5+ orders

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>({});

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/admin/api/customers', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();

      const formattedCustomers: Customer[] = data.map((dbCustomer: any) => ({
        id: dbCustomer.id,
        name: dbCustomer.name,
        email: dbCustomer.email,
        phone: dbCustomer.phone,
        totalOrders: parseInt(dbCustomer.total_orders) || 0,
        lifetimeValue: parseFloat(dbCustomer.lifetime_value) || 0,
        specialNotes: dbCustomer.special_notes || "",
        tags: dbCustomer.tags || [],
        orderHistory: (dbCustomer.orders || []).map((dbOrder: any) => ({
          orderId: dbOrder.friendly_id,
          date: dbOrder.created_at,
          total: parseFloat(dbOrder.total)
        }))
      }));

      setCustomers(formattedCustomers);
    } catch (err) {
      console.error(err);
      alert('Error fetching customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const formatPhoneNumber = (phone: string) => {
    // Format Pakistani phone numbers (03XXXXXXXXX)
    if (phone.length === 11 && phone.startsWith('03')) {
      return `${phone.slice(0, 4)}-${phone.slice(4, 11)}`;
    }
    return phone;
  };

  const handleSaveCustomer = async () => {
    if (selectedCustomer) {
      // Optimistic update
      const updatedCustomer = { ...selectedCustomer, ...editedCustomer } as Customer;
      setCustomers(customers.map(c =>
        c.id === selectedCustomer.id
          ? updatedCustomer
          : c
      ));
      setSelectedCustomer(updatedCustomer);
      setIsEditing(false);

      try {
        const res = await fetch(`/admin/api/customers/${selectedCustomer.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: editedCustomer.name,
            email: editedCustomer.email,
            phone: editedCustomer.phone,
            special_notes: editedCustomer.specialNotes,
            total_orders: editedCustomer.totalOrders,
            lifetime_value: editedCustomer.lifetimeValue,
            tags: editedCustomer.tags
          })
        });
        if (!res.ok) throw new Error('Failed to update customer');
      } catch (err) {
        alert("Failed to save customer details. Reverting...");
        fetchCustomers();
      }
    }
  };

  const openCustomerDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditing(false);
    setEditedCustomer({});
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      const res = await fetch(`/admin/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete customer');

      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      setCustomerToDelete(null);
      setSelectedCustomer(null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to delete customer.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-[#7A0D19]"
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: 600,
          }}
        >
          Client Registry
        </h1>

        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="text-center p-12 text-gray-500 font-body">Loading client registry from database...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center p-12 text-gray-500 font-body">No clients found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="rounded-2xl p-6 cursor-pointer transition-all hover:translate-y-[-4px]"
              style={{
                background: 'white',
                boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
              }}
              onClick={() => openCustomerDialog(customer)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: '#F2D2D6' }}
                  >
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      {customer.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {customer.tags?.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: '#7A0D19', color: 'white' }}>
                          {tag}
                        </span>
                      ))}
                      {customer.totalOrders >= VIP_ORDER_THRESHOLD && !customer.tags?.includes('VIP') && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5" style={{ color: '#7A0D19', background: '#F2D2D6', borderRadius: '9999px' }}>
                          <Star className="w-3 h-3 fill-current" />
                          <span>VIP</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{formatPhoneNumber(customer.phone)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{customer.totalOrders} Orders</span>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: '#F2D2D6' }}>
                <span className="text-sm text-gray-600">Lifetime Value</span>
                <span
                  style={{
                    fontFamily: 'Playfair Display, serif',
                    color: '#7A0D19',
                  }}
                >
                  Rs. {customer.lifetimeValue.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Details Dialog */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedCustomer(null);
            setIsEditing(false);
            setEditedCustomer({});
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                {isEditing ? (
                  <Input
                    value={editedCustomer.name || ""}
                    onChange={e => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                    className="h-8 text-lg w-64"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{selectedCustomer?.name}</span>
                    {selectedCustomer?.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-normal" style={{ background: '#7A0D19', color: 'white' }}>
                        {tag}
                      </span>
                    ))}
                    {(selectedCustomer?.totalOrders ?? 0) >= VIP_ORDER_THRESHOLD && !selectedCustomer?.tags?.includes('VIP') && (
                      <span className="text-sm font-normal" style={{ color: '#7A0D19' }}>
                        <Star className="w-4 h-4 inline fill-current" /> VIP
                      </span>
                    )}
                  </div>
                )}
              </DialogTitle>
              {selectedCustomer && (
                <div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-full">Cancel</Button>
                      <Button
                        size="sm"
                        onClick={handleSaveCustomer}
                        style={{ background: '#7A0D19', color: 'white', marginRight: '15px' }}
                        className="rounded-full"
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditedCustomer(selectedCustomer); setIsEditing(true); }}
                        className="rounded-full gap-2 text-xs h-8"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerToDelete(selectedCustomer)}
                        className="rounded-full gap-2 text-xs h-8 hover:bg-red-50"
                        style={{ borderColor: '#ef4444', color: '#ef4444', marginRight: '10px' }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                  <div className="text-xs text-gray-600 mb-1">Email</div>
                  {isEditing ? (
                    <Input
                      value={editedCustomer.email || ""}
                      onChange={e => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    <div className="text-sm">{selectedCustomer.email}</div>
                  )}
                </div>
                <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                  <div className="text-xs text-gray-600 mb-1">Phone</div>
                  {isEditing ? (
                    <Input
                      value={editedCustomer.phone || ""}
                      onChange={e => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    <div className="text-sm">{formatPhoneNumber(selectedCustomer.phone)}</div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl text-center flex flex-col items-center justify-center" style={{ background: '#E5B6BB20' }}>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedCustomer.totalOrders ?? 0}
                      onChange={e => setEditedCustomer({ ...editedCustomer, totalOrders: parseInt(e.target.value) || 0 })}
                      className="h-10 text-xl font-medium text-center w-24 mb-1"
                      style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}
                    />
                  ) : (
                    <div
                      className="text-2xl mb-1"
                      style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}
                    >
                      {selectedCustomer.totalOrders}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">Total Orders</div>
                </div>
                <div className="p-4 rounded-xl text-center flex flex-col items-center justify-center" style={{ background: '#E5B6BB20' }}>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mb-1">
                      <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>Rs.</span>
                      <Input
                        type="number"
                        value={editedCustomer.lifetimeValue ?? 0}
                        onChange={e => setEditedCustomer({ ...editedCustomer, lifetimeValue: parseFloat(e.target.value) || 0 })}
                        className="h-10 text-xl font-medium w-32"
                        style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="text-2xl mb-1"
                      style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}
                    >
                      Rs. {selectedCustomer.lifetimeValue.toLocaleString()}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">Lifetime Value</div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Order History
                </h3>
                <div className="space-y-2">
                  {selectedCustomer.orderHistory.map((order) => (
                    <div
                      key={order.orderId}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: '#FCF9F7' }}
                    >
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                          #{order.orderId}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.date).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                        Rs. {order.total.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Special Notes
                </h3>

                {isEditing ? (
                  <Textarea
                    value={editedCustomer.specialNotes || ""}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, specialNotes: e.target.value })}
                    className="rounded-xl min-h-[100px]"
                    placeholder="Add special notes about this customer..."
                  />
                ) : (
                  <div
                    className="p-4 rounded-xl text-sm"
                    style={{ background: '#FCF9F7' }}
                  >
                    {selectedCustomer.specialNotes || "No special notes"}
                  </div>
                )}
              </div>

              {/* Tags Editor */}
              <div>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Tags
                </h3>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        id="new-tag"
                        placeholder="Add a new tag (e.g., VIP, Wholesale, Influencer)"
                        className="h-9"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !editedCustomer.tags?.includes(val)) {
                              setEditedCustomer({
                                ...editedCustomer,
                                tags: [...(editedCustomer.tags || []), val]
                              });
                            }
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ borderColor: '#7A0D19', color: '#7A0D19' }}
                        onClick={() => {
                          const input = document.getElementById('new-tag') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !editedCustomer.tags?.includes(val)) {
                            setEditedCustomer({
                              ...editedCustomer,
                              tags: [...(editedCustomer.tags || []), val]
                            });
                          }
                          input.value = '';
                        }}
                      >
                        Add Tag
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editedCustomer.tags?.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                          {tag}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors"
                            onClick={() => {
                              setEditedCustomer({
                                ...editedCustomer,
                                tags: editedCustomer.tags?.filter(t => t !== tag)
                              })
                            }}
                          />
                        </span>
                      ))}
                      {(!editedCustomer.tags || editedCustomer.tags.length === 0) && (
                        <span className="text-sm text-gray-400 italic">No tags assigned.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.tags?.length ? (
                      selectedCustomer.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-sm" style={{ background: '#F2D2D6', color: '#7A0D19' }}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 italic">No tags</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#7A0D19' }}>
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and it will be permanently removed from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
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