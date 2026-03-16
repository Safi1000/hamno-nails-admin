import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, Eye, Package, Plus, Edit2, Filter, Trash2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  thumbnail: string;
}

interface Order {
  id: string;
  dbId?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  trackingId?: string;
  address: {
    houseNo: string;
    street: string;
    sector: string;
    city: string;
  };
  items: OrderItem[];
  hasLuxuryGiftBox: boolean;
  total: number;
  orderNotes?: string;
  orderDate: string;
}

export function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<Order>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'All'>('All');
  const [giftBoxFilter, setGiftBoxFilter] = useState<'All' | 'With Gift Box' | 'Without Gift Box'>('All');

  // Create order via Admin currently not implemented for backend sync
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    status: "Pending" as Order['status'],
    trackingId: "",
    address: {
      houseNo: "",
      street: "",
      sector: "",
      city: ""
    },
    productName: "",
    quantity: 1,
    price: 0,
    hasLuxuryGiftBox: false
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/admin/api/orders', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();

      const formattedOrders: Order[] = data.map((dbOrder: any) => ({
        id: dbOrder.friendly_id,
        dbId: dbOrder.id, // Keep the real UUID for PATCH requests
        customerId: dbOrder.customers?.id,
        customerName: dbOrder.customers?.name || 'Unknown',
        customerEmail: dbOrder.customers?.email || 'Unknown',
        customerPhone: dbOrder.customers?.phone || 'Unknown',
        status: dbOrder.status,
        trackingId: dbOrder.tracking_id || undefined,
        address: dbOrder.address,
        hasLuxuryGiftBox: dbOrder.has_luxury_gift_box,
        total: parseFloat(dbOrder.total),
        orderNotes: dbOrder.order_notes || "",
        orderDate: dbOrder.created_at,
        items: (dbOrder.order_items || []).map((dbItem: any) => ({
          productName: dbItem.product_name,
          quantity: dbItem.quantity,
          price: parseFloat(dbItem.price),
          thumbnail: dbItem.thumbnail || "💅"
        }))
      }));

      setOrders(formattedOrders);
      return formattedOrders;
    } catch (err) {
      console.error(err);
      alert('Error fetching orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders().then((fetchedOrders) => {
      if (fetchedOrders) {
        const viewId = searchParams.get('view');
        if (viewId) {
          const orderToView = fetchedOrders.find((o: Order) => o.id === viewId);
          if (orderToView) {
            setSelectedOrder(orderToView);
          }
        }
      }
    });
  }, []);

  const generateOrderId = () => {
    // Find the highest order number
    const orderNumbers = orders.map(order => {
      const match = order.id.match(/NBH-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = Math.max(...orderNumbers, 1020);
    return `NBH-${maxNumber + 1}`;
  };

  const handleAddOrder = () => {
    const order: Order = {
      id: generateOrderId(),
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail,
      customerPhone: newOrder.customerPhone,
      status: newOrder.status,
      trackingId: newOrder.trackingId || undefined,
      address: newOrder.address,
      items: [
        {
          productName: newOrder.productName,
          quantity: newOrder.quantity,
          price: newOrder.price,
          thumbnail: "💅"
        }
      ],
      hasLuxuryGiftBox: newOrder.hasLuxuryGiftBox,
      total: newOrder.price * newOrder.quantity + (newOrder.hasLuxuryGiftBox ? 250 : 0),
      orderDate: new Date().toISOString().split('T')[0]
    };

    setOrders([order, ...orders]);
    setIsAddOrderOpen(false);

    // Reset form
    setNewOrder({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      status: "Pending",
      trackingId: "",
      address: {
        houseNo: "",
        street: "",
        sector: "",
        city: ""
      },
      productName: "",
      quantity: 1,
      price: 0,
      hasLuxuryGiftBox: false
    });
  };

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    // Optimistic UI update
    setOrders(orders.map(o =>
      o.id === order.id ? { ...o, status: newStatus } : o
    ));

    try {
      // @ts-ignore - dbId is added in formatting but not in original interface
      const dbId = order.dbId;
      const res = await fetch(`/admin/api/orders/${dbId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status in database');
    } catch (err) {
      alert("Failed to update order status. Reverting...");
      fetchOrders(); // Revert on failure
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;

    // Opt update
    const updatedOrder = { ...selectedOrder, ...editedOrder } as Order;
    setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setIsEditingOrder(false);

    try {
      // @ts-ignore
      const dbId = selectedOrder.dbId;
      const res = await fetch(`/admin/api/orders/${dbId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tracking_id: editedOrder.trackingId,
          address: editedOrder.address,
          has_luxury_gift_box: editedOrder.hasLuxuryGiftBox,
          total: editedOrder.total,
          order_notes: editedOrder.orderNotes,
          customer_id: selectedOrder.customerId,
          customer_name: editedOrder.customerName,
          customer_email: editedOrder.customerEmail,
          customer_phone: editedOrder.customerPhone
        })
      });
      if (!res.ok) throw new Error('Failed to update order details');
      fetchOrders();
    } catch (err) {
      alert("Failed to save order details. Reverting...");
      fetchOrders();
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    // Only use the real UUID for deletion
    const dbId = orderToDelete.dbId || orderToDelete.id;

    try {
      const res = await fetch(`/admin/api/orders/${dbId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete order');

      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setOrderToDelete(null);
      setSelectedOrder(null);
      setIsEditingOrder(false);
    } catch (err) {
      console.error(err);
      alert('Failed to delete order.');
    }
  };

  const getStatusBadgeStyle = (status: Order['status']) => {
    const styles = {
      'Pending': { background: '#F2D2D6', color: '#7A0D19' },
      'Processing': { background: '#FCF9F7', color: '#7A0D19', border: '1px solid #F2D2D6' },
      'Shipped': { background: '#7A0D19', color: 'white' },
      'Delivered': { background: '#E5F5E5', color: '#2D7A2D' }
    };
    return styles[status];
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(order =>
    statusFilter === 'All' || order.status === statusFilter
  ).filter(order =>
    giftBoxFilter === 'All' || (giftBoxFilter === 'With Gift Box' ? order.hasLuxuryGiftBox : !order.hasLuxuryGiftBox)
  );

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
          Order Ledger
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search orders, customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>

          <Button
            onClick={() => setIsAddOrderOpen(true)}
            style={{
              background: '#7A0D19',
              color: 'white',
              borderRadius: '9999px',
              padding: '0.5rem 1.5rem',
            }}
            className="flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Order
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="rounded-2xl p-4 mb-4 flex items-center gap-4"
        style={{
          background: 'white',
          boxShadow: '0 4px 12px rgba(122, 13, 25, 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: '#7A0D19' }} />
          <span className="text-sm" style={{ color: '#7A0D19', fontFamily: 'Playfair Display, serif' }}>
            Filters:
          </span>
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Order['status'] | 'All')}>
          <SelectTrigger
            className="w-40 rounded-full border-2"
            style={{ borderColor: '#F2D2D6' }}
          >
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Shipped">Shipped</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>

        <Select value={giftBoxFilter} onValueChange={(value) => setGiftBoxFilter(value as typeof giftBoxFilter)}>
          <SelectTrigger
            className="w-48 rounded-full border-2"
            style={{ borderColor: '#F2D2D6' }}
          >
            <SelectValue placeholder="All Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Orders</SelectItem>
            <SelectItem value="With Gift Box">With Gift Box</SelectItem>
            <SelectItem value="Without Gift Box">Without Gift Box</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <span>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found</span>
        </div>
      </div>

      {/* Orders Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'white',
          boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FCF9F7' }}>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Order ID
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Customer
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Phone
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Status
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Tracking ID
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Gift Box
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Location
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Total
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Notes
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Date
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={10} className="text-center p-8 text-gray-500 font-body">Loading orders from database...</TableCell>
              </TableRow>
            </TableBody>
          ) : filteredOrders.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={10} className="text-center p-8 text-gray-500 font-body">No orders found.</TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-[#FCF9F7] transition"
                >
                  <TableCell>
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      {order.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order, value as Order['status'])}
                    >
                      <SelectTrigger
                        className="w-32 border-0"
                        style={getStatusBadgeStyle(order.status)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-500">
                      {order.trackingId || <span className="text-gray-400 italic">None</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.hasLuxuryGiftBox ? (
                      <Package className="w-4 h-4" style={{ color: '#7A0D19' }} />
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{order.address.sector}, {order.address.city}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      Rs. {order.total.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate" title={order.orderNotes}>
                      {order.orderNotes || <span className="italic text-gray-400">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(order.orderDate).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 rounded-full hover:bg-[#F2D2D6] transition"
                    >
                      <Eye className="w-4 h-4" style={{ color: '#7A0D19' }} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {/* Add Order Dialog */}
      <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
              Create New Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customer Information */}
            <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" style={{ color: '#7A0D19' }}>Name *</Label>
                  <Input
                    id="customerName"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail" style={{ color: '#7A0D19' }}>Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newOrder.customerEmail}
                    onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="customerPhone" style={{ color: '#7A0D19' }}>Phone (Pakistani format) *</Label>
                  <Input
                    id="customerPhone"
                    placeholder="03001234567"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Delivery Address
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="houseNo" style={{ color: '#7A0D19' }}>House/Flat No *</Label>
                  <Input
                    id="houseNo"
                    value={newOrder.address.houseNo}
                    onChange={(e) => setNewOrder({ ...newOrder, address: { ...newOrder.address, houseNo: e.target.value } })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="street" style={{ color: '#7A0D19' }}>Street *</Label>
                  <Input
                    id="street"
                    value={newOrder.address.street}
                    onChange={(e) => setNewOrder({ ...newOrder, address: { ...newOrder.address, street: e.target.value } })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sector" style={{ color: '#7A0D19' }}>Sector/Area *</Label>
                  <Input
                    id="sector"
                    value={newOrder.address.sector}
                    onChange={(e) => setNewOrder({ ...newOrder, address: { ...newOrder.address, sector: e.target.value } })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city" style={{ color: '#7A0D19' }}>City *</Label>
                  <Input
                    id="city"
                    value={newOrder.address.city}
                    onChange={(e) => setNewOrder({ ...newOrder, address: { ...newOrder.address, city: e.target.value } })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Product Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="productName" style={{ color: '#7A0D19' }}>Product Name *</Label>
                  <Input
                    id="productName"
                    value={newOrder.productName}
                    onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" style={{ color: '#7A0D19' }}>Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="price" style={{ color: '#7A0D19' }}>Price (Rs.) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" style={{ color: '#7A0D19' }}>Order Status *</Label>
                <Select
                  value={newOrder.status}
                  onValueChange={(value) => setNewOrder({ ...newOrder, status: value as Order['status'] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="trackingId" style={{ color: '#7A0D19' }}>Tracking ID (Optional)</Label>
                <Input
                  id="trackingId"
                  placeholder="e.g., TRK-PK-2024-1025"
                  value={newOrder.trackingId}
                  onChange={(e) => setNewOrder({ ...newOrder, trackingId: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Gift Box */}
            <div className="flex items-center space-x-2 p-4 rounded-xl" style={{ background: '#E5B6BB20' }}>
              <Checkbox
                id="giftBox"
                checked={newOrder.hasLuxuryGiftBox}
                onCheckedChange={(checked) => setNewOrder({ ...newOrder, hasLuxuryGiftBox: checked as boolean })}
              />
              <label
                htmlFor="giftBox"
                className="text-sm cursor-pointer flex items-center gap-2"
                style={{ color: '#7A0D19' }}
              >
                <Package className="w-4 h-4" />
                Add Luxury Gift Box (+ Rs. 250)
              </label>
            </div>

            {/* Total Preview */}
            <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: '#F2D2D6' }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }}>
                Order Total
              </span>
              <span
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.5rem',
                  color: '#7A0D19',
                }}
              >
                Rs. {(newOrder.price * newOrder.quantity + (newOrder.hasLuxuryGiftBox ? 250 : 0)).toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddOrderOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddOrder}
                disabled={!newOrder.customerName || !newOrder.customerEmail || !newOrder.customerPhone || !newOrder.productName || !newOrder.price}
                style={{
                  background: '#7A0D19',
                  color: 'white',
                  borderRadius: '9999px',
                }}
                className="hover:opacity-90 transition disabled:opacity-50"
              >
                Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedOrder(null);
            setIsEditingOrder(false);
            setEditedOrder({});
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                Order #{selectedOrder?.id}
              </DialogTitle>
              {selectedOrder && (
                <div>
                  {isEditingOrder ? (
                    <Button
                      onClick={handleSaveOrder}
                      size="sm"
                      style={{ background: '#7A0D19', color: 'white', borderRadius: '9999px', marginRight: '10px' }}
                    >
                      Save Changes
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditedOrder(selectedOrder);
                          setIsEditingOrder(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Order
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrderToDelete(selectedOrder)}
                        className="rounded-full gap-2 hover:bg-red-50"
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

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Customer Information
                </h3>
                {isEditingOrder ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-16 text-gray-600 shrink-0">Name:</span>
                      <Input
                        value={editedOrder.customerName || ""}
                        onChange={e => setEditedOrder({ ...editedOrder, customerName: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-16 text-gray-600 shrink-0">Email:</span>
                      <Input
                        value={editedOrder.customerEmail || ""}
                        onChange={e => setEditedOrder({ ...editedOrder, customerEmail: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-16 text-gray-600 shrink-0">Phone:</span>
                      <Input
                        value={editedOrder.customerPhone || ""}
                        onChange={e => setEditedOrder({ ...editedOrder, customerPhone: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedOrder.customerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span>{selectedOrder.customerPhone}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              {(selectedOrder.orderNotes || isEditingOrder) && (
                <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                  <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                    Checkout Notes
                  </h3>
                  {isEditingOrder ? (
                    <Textarea
                      value={editedOrder.orderNotes || ""}
                      onChange={(e) => setEditedOrder({ ...editedOrder, orderNotes: e.target.value })}
                      placeholder="Add or update notes..."
                      className="text-sm border-[#F2D2D6]"
                      rows={3}
                    />
                  ) : (
                    <div className="text-sm italic text-gray-700 whitespace-pre-wrap">
                      {selectedOrder.orderNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Tracking Info */}
              {(selectedOrder.trackingId || isEditingOrder) && (
                <div className="p-4 rounded-xl" style={{ background: '#E5B6BB20' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tracking ID:</span>
                    {isEditingOrder ? (
                      <Input
                        value={editedOrder.trackingId || ""}
                        onChange={(e) => setEditedOrder({ ...editedOrder, trackingId: e.target.value })}
                        placeholder="TRK-PK-1234"
                        className="w-1/2 h-8 text-sm"
                      />
                    ) : (
                      <span className="font-mono text-sm" style={{ color: '#7A0D19' }}>
                        {selectedOrder.trackingId}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Delivery Address */}
              <div className="p-4 rounded-xl" style={{ background: '#FCF9F7' }}>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Delivery Address
                </h3>
                {isEditingOrder && editedOrder.address ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-24 text-gray-600 shrink-0">House/Flat:</span>
                      <Input
                        value={editedOrder.address.houseNo}
                        onChange={e => setEditedOrder({ ...editedOrder, address: { ...editedOrder.address!, houseNo: e.target.value } })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-24 text-gray-600 shrink-0">Street:</span>
                      <Input
                        value={editedOrder.address.street}
                        onChange={e => setEditedOrder({ ...editedOrder, address: { ...editedOrder.address!, street: e.target.value } })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-24 text-gray-600 shrink-0">Sector/Area:</span>
                      <Input
                        value={editedOrder.address.sector}
                        onChange={e => setEditedOrder({ ...editedOrder, address: { ...editedOrder.address!, sector: e.target.value } })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="w-24 text-gray-600 shrink-0">City:</span>
                      <Input
                        value={editedOrder.address.city}
                        onChange={e => setEditedOrder({ ...editedOrder, address: { ...editedOrder.address!, city: e.target.value } })}
                        className="h-8"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div>House/Flat: {selectedOrder.address.houseNo}</div>
                    <div>Street: {selectedOrder.address.street}</div>
                    <div>Sector/Area: {selectedOrder.address.sector}</div>
                    <div>City: {selectedOrder.address.city}</div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                  Order Items
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ background: '#FCF9F7' }}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ background: '#F2D2D6' }}
                      >
                        {item.thumbnail.startsWith('http') || item.thumbnail.includes('/') ? (
                          <img src={item.thumbnail} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{item.thumbnail}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div>{item.productName}</div>
                        <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                        Rs. {item.price.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {(selectedOrder.hasLuxuryGiftBox || isEditingOrder) && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#E5B6BB20' }}>
                  {isEditingOrder ? (
                    <>
                      <Checkbox
                        id="editGiftBox"
                        checked={editedOrder.hasLuxuryGiftBox}
                        onCheckedChange={(checked) => {
                          const isGiftBoxChecked = checked as boolean;
                          const currentTotal = editedOrder.total || selectedOrder.total;
                          const wasChecked = editedOrder.hasLuxuryGiftBox;
                          // only change total if status is actually changing
                          let newTotal = currentTotal;
                          if (isGiftBoxChecked && !wasChecked) newTotal += 250;
                          else if (!isGiftBoxChecked && wasChecked) newTotal -= 250;

                          setEditedOrder({
                            ...editedOrder,
                            hasLuxuryGiftBox: isGiftBoxChecked,
                            total: newTotal
                          });
                        }}
                      />
                      <label htmlFor="editGiftBox" className="text-sm cursor-pointer" style={{ color: '#7A0D19' }}>
                        Luxury Gift Box Included (+Rs. 250)
                      </label>
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" style={{ color: '#7A0D19' }} />
                      <span className="text-sm" style={{ color: '#7A0D19' }}>Luxury Gift Box Included</span>
                    </>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: '#F2D2D6' }}>
                <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }}>Total</span>
                {isEditingOrder ? (
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>Rs.</span>
                    <Input
                      type="number"
                      value={editedOrder.total || 0}
                      onChange={(e) => setEditedOrder({ ...editedOrder, total: parseFloat(e.target.value) || 0 })}
                      className="w-32 h-10 text-right font-medium"
                      style={{ color: '#7A0D19' }}
                    />
                  </div>
                ) : (
                  <span
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '1.5rem',
                      color: '#7A0D19',
                    }}
                  >
                    Rs. {selectedOrder.total.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#7A0D19' }}>
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone and it will be permanently removed from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
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