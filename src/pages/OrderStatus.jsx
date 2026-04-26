import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, XCircle, Loader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const OrderStatus = () => {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const trackOrder = async (e) => {
        e.preventDefault();
        if (!orderId.trim()) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const res = await axios.get(`${API_URL}/track/${orderId}`);
            setOrder(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to track order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Track Your Order</h1>
                    <p className="text-slate-400">Enter your order ID to check the status</p>
                </div>

                <form onSubmit={trackOrder} className="mb-8">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="Enter Order ID (e.g., 67e6e138b9684d71489a2600)"
                            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all"
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : 'Track'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                )}

                {order && (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">{order.gameName}</h2>
                                <p className="text-slate-400 text-sm">{order.orderId}</p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Amount</p>
                                <p className="text-white font-bold">{order.amount}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Payment</p>
                                <p className="text-white font-bold">{order.paymentMethod}</p>
                            </div>
                            {order.transactionId && (
                                <div className="bg-slate-700/50 rounded-lg p-3 col-span-2">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Transaction ID</p>
                                    <p className="text-white font-mono text-sm">{order.transactionId}</p>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Order Progress</h3>
                            <div className="space-y-4">
                                {order.statusSteps.map((step, index) => (
                                    <div key={step.id} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            step.completed ? 'bg-green-500' : 
                                            step.active ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'
                                        }`}>
                                            {step.completed ? (
                                                <CheckCircle size={16} className="text-white" />
                                            ) : step.active ? (
                                                <Clock size={16} className="text-white" />
                                            ) : (
                                                <span className="text-slate-400 text-sm">{step.id}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-medium ${
                                                step.completed || step.active ? 'text-white' : 'text-slate-500'
                                            }`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {order.isCompleted && (
                            <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mt-4">
                                <p className="text-green-400 text-center font-bold">
                                    ✨ Your order has been completed! Check your email for delivery details.
                                </p>
                            </div>
                        )}

                        {order.isRejected && (
                            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mt-4">
                                <p className="text-red-400 text-center font-bold">
                                    ❌ Your order was rejected. Please contact support.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

function StatusBadge({ status }) {
    const config = {
        completed: { bg: 'bg-green-500', text: 'Completed', icon: CheckCircle },
        processing: { bg: 'bg-blue-500', text: 'Processing', icon: Clock },
        pending: { bg: 'bg-yellow-500', text: 'Pending', icon: Clock },
        rejected: { bg: 'bg-red-500', text: 'Rejected', icon: XCircle },
        awaiting_payment: { bg: 'bg-yellow-500', text: 'Awaiting Payment', icon: Clock }
    };

    const { bg, text, icon: Icon } = config[status] || config.pending;

    return (
        <div className={`${bg} px-3 py-1 rounded-full flex items-center gap-1`}>
            <Icon size={14} className="text-white" />
            <span className="text-white text-sm font-bold">{text}</span>
        </div>
    );
}

export default OrderStatus;