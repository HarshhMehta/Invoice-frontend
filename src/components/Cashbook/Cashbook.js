import React, { useState, useEffect } from 'react';
import { Plus, Minus, DollarSign, Calendar, Receipt, Trash2, Edit3, Save, X, Filter, Search, RefreshCw, AlertCircle, Settings } from 'lucide-react';

const API_BASE_URL = 'https://backend.dotcomwebs.shop/api/cashbook'; // Change this to your server URL

const CashBookSystem = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [balance, setBalance] = useState({ 
    initialBalance: 0, 
    totalCredit: 0, 
    totalDebit: 0, 
    balance: 0, 
    totalTransactions: 0,
    hasInitialBalance: false 
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  const [newTransaction, setNewTransaction] = useState({
    type: 'credit',
    amount: '',
    particular: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    paymentMode: 'cash'
  });

  // Initial balance form state
  const [initialBalance, setInitialBalance] = useState({
    amount: '',
    remarks: 'Opening Balance'
  });

  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    searchText: '',
    amountMin: '',
    amountMax: '',
    category: '',
    paymentMode: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch transactions from API
  const fetchTransactions = async (page = 1, limit = 50) => {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v && v !== 'all' && v !== ''))
      });

      const response = await fetch(`${API_BASE_URL}?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setFilteredTransactions(data.transactions);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          totalCount: data.totalCount
        });
      } else {
        setError(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance from API
  const fetchBalance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/balance`);
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.data);
        
        // If no initial balance is set, show the initial balance form
        if (!data.data.hasInitialBalance) {
          setShowInitialBalance(true);
        }
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  // Set initial balance
  const setInitialBalanceAmount = async () => {
    if (!initialBalance.amount || parseFloat(initialBalance.amount) < 0) {
      setError('Please enter a valid initial balance amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/initial-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(initialBalance.amount),
          remarks: initialBalance.remarks || 'Opening Balance'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Initial balance set successfully!');
        setShowInitialBalance(false);
        setInitialBalance({ amount: '', remarks: 'Opening Balance' });
        fetchBalance();
        fetchTransactions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to set initial balance');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      console.error('Error setting initial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add transaction via API
  const addTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.particular) {
      setError('Amount and Particular fields are required!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Transaction created successfully!');
        resetForm();
        fetchTransactions();
        fetchBalance();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to create transaction');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      console.error('Error creating transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update transaction via API
  const updateTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.particular) {
      setError('Amount and Particular fields are required!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Transaction updated successfully!');
        resetForm();
        fetchTransactions();
        fetchBalance();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update transaction');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      console.error('Error updating transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction via API
  const deleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Transaction deleted successfully!');
        fetchTransactions();
        fetchBalance();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete transaction');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      console.error('Error deleting transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  const editTransaction = (transaction) => {
    setNewTransaction({
      type: transaction.type,
      amount: transaction.amount.toString(),
      particular: transaction.particular,
      remarks: transaction.remarks || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
      category: transaction.category || 'General',
      paymentMode: transaction.paymentMode || 'cash'
    });
    setEditingId(transaction._id);
    setShowAddTransaction(true);
  };

  const resetForm = () => {
    setNewTransaction({
      type: 'credit',
      amount: '',
      particular: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      paymentMode: 'cash'
    });
    setEditingId(null);
    setShowAddTransaction(false);
    setError('');
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateFrom: '',
      dateTo: '',
      searchText: '',
      amountMin: '',
      amountMax: '',
      category: '',
      paymentMode: ''
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchTransactions();
    fetchBalance();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTransactions(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
            <div className="h-5 w-5 bg-green-500 rounded-full"></div>
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Initial Balance Setup Modal */}
        {showInitialBalance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Set Initial Balance</h2>
                <p className="text-gray-600">Enter your opening cash balance to get started</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Balance Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={initialBalance.amount}
                      onChange={(e) => setInitialBalance({...initialBalance, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={initialBalance.remarks}
                    onChange={(e) => setInitialBalance({...initialBalance, remarks: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opening Balance"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={setInitialBalanceAmount}
                  disabled={loading || !initialBalance.amount}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Setting...' : 'Set Initial Balance'}
                </button>
                <button
                  onClick={() => setShowInitialBalance(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Cash Book System</h1>
                <p className="text-gray-600">Manage your cash transactions efficiently</p>
                {loading && <div className="text-blue-600 text-sm">Loading...</div>}
              </div>
              
              {/* Initial Balance Settings Button */}
              {balance.hasInitialBalance && (
                <button
                  onClick={() => setShowInitialBalance(true)}
                  className="bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors"
                  title="Update Initial Balance"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>
            
            {/* Balance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full md:w-auto">
              {/* Initial Balance Card */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Initial Balance</p>
                    <p className="text-xl font-bold">₹{balance.initialBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Current Balance</p>
                    <p className="text-xl font-bold">₹{balance.balance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Total Credit</p>
                    <p className="text-xl font-bold">₹{balance.totalCredit?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2">
                  <Minus className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Total Debit</p>
                    <p className="text-xl font-bold">₹{balance.totalDebit?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Total Transactions</p>
                    <p className="text-xl font-bold">{pagination.totalCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Formula Display */}
        {balance.hasInitialBalance && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-blue-700 mb-2">Balance Calculation:</p>
              <p className="text-lg font-medium text-blue-800">
                ₹{balance.initialBalance?.toFixed(2)} (Initial) + ₹{balance.totalCredit?.toFixed(2)} (Credits) - ₹{balance.totalDebit?.toFixed(2)} (Debits) = ₹{balance.balance?.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {pagination.totalCount} results
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="Search in particulars or remarks..."
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="credit">Credit Only</option>
                  <option value="debit">Debit Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <select
                  value={filters.paymentMode}
                  onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                <input
                  type="number"
                  value={filters.amountMin}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="₹ 0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                <input
                  type="number"
                  value={filters.amountMax}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="₹ 999999"
                />
              </div>
            </div>
          )}
        </div>

        {/* Add Transaction Button */}
        {!showAddTransaction && (
          <div className="text-center mb-6">
            <button
              onClick={() => setShowAddTransaction(true)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Plus className="h-5 w-5 inline mr-2" />
              Add New Transaction
            </button>
          </div>
        )}

        {/* Add/Edit Transaction Form */}
        {showAddTransaction && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingId ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credit">Credit (Cash In)</option>
                  <option value="debit">Debit (Cash Out)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Particular *</label>
                <input
                  type="text"
                  value={newTransaction.particular}
                  onChange={(e) => setNewTransaction({...newTransaction, particular: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={newTransaction.paymentMode}
                  onChange={(e) => setNewTransaction({...newTransaction, paymentMode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={newTransaction.remarks}
                  onChange={(e) => setNewTransaction({...newTransaction, remarks: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingId ? updateTransaction : addTransaction}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : (editingId ? 'Update Transaction' : 'Save Transaction')}
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Recent Transactions</h3>
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-400 mt-2">
                {filters.searchText || filters.type !== 'all' || filters.dateFrom || filters.dateTo 
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by adding your first transaction'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Particular</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{transaction.particular}</div>
                        {transaction.remarks && (
                          <div className="text-xs text-gray-500 mt-1">{transaction.remarks}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {transaction.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {transaction.paymentMode || 'cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.type === 'credit' ? (
                          <span className="text-green-600 font-semibold">₹{transaction.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.type === 'debit' ? (
                          <span className="text-red-600 font-semibold">₹{transaction.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={`${transaction.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{transaction.runningBalance?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction._id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.currentPage - 1) * 50 + 1} to {Math.min(pagination.currentPage * 50, pagination.totalCount)} of {pagination.totalCount} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchTransactions(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1 || loading}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchTransactions(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages || loading}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashBookSystem;