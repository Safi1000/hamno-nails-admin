import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, DollarSign, CreditCard, Banknote, CheckCircle2, Clock, Edit2, Check, X, Trash2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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

interface Payment {
  id: string;
  orderId: string;
  trackingId?: string;
  customerName: string;
  amount: number;
  paymentMethod: 'COD' | 'Online';
  status: 'Completed' | 'Pending';
  date: string;
}

export function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [tempTrackingId, setTempTrackingId] = useState("");
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/admin/api/orders', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch orders for payments');
      const data = await res.json();

      const formattedPayments: Payment[] = data.map((dbOrder: any) => ({
        id: dbOrder.id, // Database original UUID for patch requests
        orderId: dbOrder.friendly_id,
        trackingId: dbOrder.tracking_id || undefined,
        customerName: dbOrder.customers?.name || 'Unknown',
        amount: parseFloat(dbOrder.total),
        paymentMethod: dbOrder.payment_method || 'COD',
        status: dbOrder.payment_status || 'Pending',
        date: dbOrder.created_at
      }));

      setPayments(formattedPayments);
    } catch (err) {
      console.error(err);
      alert('Error fetching payment records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleStatusChange = async (paymentId: string, newStatus: Payment['status']) => {
    setPayments(payments.map(payment =>
      payment.id === paymentId ? { ...payment, status: newStatus } : payment
    ));

    try {
      const res = await fetch(`/admin/api/orders/${paymentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment_status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err) {
      alert("Failed to update status. Reverting...");
      fetchPayments();
    }
  };

  const handleEditTrackingId = (paymentId: string, currentTrackingId?: string) => {
    setEditingTrackingId(paymentId);
    setTempTrackingId(currentTrackingId || "");
  };

  const handleSaveTrackingId = async (paymentId: string) => {
    const trackingToSave = tempTrackingId || undefined;
    setPayments(payments.map(payment =>
      payment.id === paymentId ? { ...payment, trackingId: trackingToSave } : payment
    ));
    setEditingTrackingId(null);
    setTempTrackingId("");

    try {
      const res = await fetch(`/admin/api/orders/${paymentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tracking_id: trackingToSave })
      });
      if (!res.ok) throw new Error('Failed to update tracking ID');
    } catch (err) {
      alert("Failed to update tracking ID. Reverting...");
      fetchPayments();
    }
  };

  const handleCancelEdit = () => {
    setEditingTrackingId(null);
    setTempTrackingId("");
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      const res = await fetch(`/admin/api/orders/${paymentToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete payment/order');

      setPayments(payments.filter(p => p.id !== paymentToDelete));
      setPaymentToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment record.');
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payment.trackingId && payment.trackingId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCompleted = payments
    .filter(p => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const codCount = payments.filter(p => p.paymentMethod === 'COD').length;
  const onlineCount = payments.filter(p => p.paymentMethod === 'Online').length;

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
          Payment Records
        </h1>

        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search payments, tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#E5F5E5' }}
            >
              <CheckCircle2 className="w-5 h-5" style={{ color: '#2D7A2D' }} />
            </div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              color: '#7A0D19',
            }}
          >
            Rs. {totalCompleted.toLocaleString()}
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#F2D2D6' }}
            >
              <Clock className="w-5 h-5" style={{ color: '#7A0D19' }} />
            </div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              color: '#7A0D19',
            }}
          >
            Rs. {totalPending.toLocaleString()}
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#E5B6BB40' }}
            >
              <Banknote className="w-5 h-5" style={{ color: '#7A0D19' }} />
            </div>
            <span className="text-sm text-gray-600">Cash on Delivery</span>
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              color: '#7A0D19',
            }}
          >
            {codCount}
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#E5B6BB40' }}
            >
              <CreditCard className="w-5 h-5" style={{ color: '#7A0D19' }} />
            </div>
            <span className="text-sm text-gray-600">Online Payments</span>
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem',
              color: '#7A0D19',
            }}
          >
            {onlineCount}
          </div>
        </div>
      </div>

      {/* Payments Table */}
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
                Tracking ID
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Customer
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Payment Method
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Status
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Amount
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                Date
              </TableHead>
              <TableHead style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }} className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8 text-gray-500 font-body">Loading payments from database...</TableCell>
              </TableRow>
            </TableBody>
          ) : filteredPayments.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8 text-gray-500 font-body">No payment records found.</TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-[#FCF9F7] transition">
                  <TableCell>
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      #{payment.orderId}
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingTrackingId === payment.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={tempTrackingId}
                          onChange={(e) => setTempTrackingId(e.target.value)}
                          placeholder="Enter tracking ID"
                          className="h-8 text-xs font-mono"
                          style={{ width: '160px' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTrackingId(payment.id)}
                          className="p-1 rounded hover:bg-[#E5F5E5] transition"
                        >
                          <Check className="w-4 h-4" style={{ color: '#2D7A2D' }} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 rounded hover:bg-[#F2D2D6] transition"
                        >
                          <X className="w-4 h-4" style={{ color: '#7A0D19' }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-xs text-gray-500 font-mono">
                          {payment.trackingId || <span className="text-gray-400 italic not-italic">None</span>}
                        </span>
                        <button
                          onClick={() => handleEditTrackingId(payment.id, payment.trackingId)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F2D2D6] transition"
                        >
                          <Edit2 className="w-3 h-3" style={{ color: '#7A0D19' }} />
                        </button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{payment.customerName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {payment.paymentMethod === 'COD' ? (
                        <>
                          <Banknote className="w-4 h-4" style={{ color: '#7A0D19' }} />
                          <span
                            className="px-3 py-1 rounded-full text-xs"
                            style={{ background: '#E5B6BB40', color: '#7A0D19' }}
                          >
                            Cash on Delivery
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" style={{ color: '#7A0D19' }} />
                          <span
                            className="px-3 py-1 rounded-full text-xs"
                            style={{ background: '#7A0D1920', color: '#7A0D19' }}
                          >
                            Online Payment
                          </span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={payment.status}
                      onValueChange={(value) => handleStatusChange(payment.id, value as Payment['status'])}
                    >
                      <SelectTrigger
                        className="w-32 border-0"
                        style={
                          payment.status === 'Completed'
                            ? { background: '#E5F5E5', color: '#2D7A2D' }
                            : { background: '#F2D2D6', color: '#7A0D19' }
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontFamily: 'Playfair Display, serif', color: '#7A0D19' }}>
                      Rs. {payment.amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(payment.date).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs h-8"
                        style={{ borderColor: '#7A0D19', color: '#7A0D19' }}
                        onClick={() => navigate(`/orders?view=${payment.orderId}`)}
                      >
                        View Order
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentToDelete(payment.id)}
                        className="rounded-full h-8 hover:bg-red-50"
                        style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0 8px', marginRight: '10px' }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#7A0D19' }}>
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This will permanently delete the associated order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePayment}
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