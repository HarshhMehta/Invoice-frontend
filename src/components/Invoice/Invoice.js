"use client"

import { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import moment from "moment"
import { useHistory } from "react-router-dom"
import { toCommas } from "../../utils/utils"

import { initialState } from "../../initialState"
import currencies from "../../currencies.json"
import { createInvoice, getInvoice, updateInvoice } from "../../actions/invoiceActions"
import { getClientsByUser } from "../../actions/clientActions"
import AddClient from "./AddClient"
import InvoiceType from "./InvoiceType"

// Enhanced initial state with additional fields matching your format
const enhancedInitialState = {
  ...initialState,
  items: [
    {
      srNo: 1,
      itemCode: "",
      brand: "",
      itemName: "",
      description: "",
      hsnCode: "",
      unitPrice: "",
      quantity: "1", // Set default quantity to 1
      unit: "pcs",
      discount: "",
      amount: "",
      image: "",
      parent: "", // Brand/Parent from Tally
    },
  ],
}

// Updated API Base URL for your product search
const API_BASE_URL = process.env.REACT_APP_API || "https://invoice-56iv.onrender.com"

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const Invoice = () => {
  const [invoiceData, setInvoiceData] = useState(enhancedInitialState)
  const [rates, setRates] = useState(18) // Default GST rate
  const [vat, setVat] = useState(0)
  const [currency, setCurrency] = useState(currencies[0].value)
  const [subTotal, setSubTotal] = useState(0)
  const [total, setTotal] = useState(0)
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const [client, setClient] = useState(null)
  const [type, setType] = useState("Quotation")
  const [status, setStatus] = useState("")

  // Optimized product search states
  const [productCache, setProductCache] = useState(new Map()) // Cache for loaded products
  const [searchResults, setSearchResults] = useState({}) // Search results per row
  const [loadingSearch, setLoadingSearch] = useState({}) // Loading state per row
  const [searchTerms, setSearchTerms] = useState({}) // Track search terms per row
  const [showSuggestions, setShowSuggestions] = useState({})

  const debouncedSearchTerms = useDebounce(searchTerms, 300)

  const { id } = useParams()
  const clients = useSelector((state) => state.clients.clients)
  const { invoice } = useSelector((state) => state.invoices)
  const dispatch = useDispatch()
  const history = useHistory()
  const user = JSON.parse(localStorage.getItem("profile"))

  const [open, setOpen] = useState(false)

  // Updated product search function to use your specific API
  const searchProducts = useCallback(
    async (searchTerm, rowIndex) => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults((prev) => ({ ...prev, [rowIndex]: [] }))
        return
      }

      // Check cache first
      const cacheKey = searchTerm.toLowerCase()
      if (productCache.has(cacheKey)) {
        const cachedResults = productCache.get(cacheKey)
        setSearchResults((prev) => ({
          ...prev,
          [rowIndex]: Array.isArray(cachedResults) ? cachedResults : [],
        }))
        return
      }

      setLoadingSearch((prev) => ({ ...prev, [rowIndex]: true }))

      try {
        // Updated API call to match your endpoint structure
        const response = await fetch(`${API_BASE_URL}/api/products/search?q=${encodeURIComponent(searchTerm)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add authorization header if needed
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log("API Response:", result) // For debugging

        // Handle your specific API response structure
        let products = []

        // Your API returns: {"success": true, "data": [...]}
        if (result.success && Array.isArray(result.data)) {
          products = result.data
        }
        // Fallback for other possible formats
        else if (Array.isArray(result)) {
          products = result
        } else if (result.products && Array.isArray(result.products)) {
          products = result.products
        } else {
          console.warn("Unexpected API response structure:", result)
          products = []
        }

        // Transform products to match our required format
        const transformedProducts = products.map((item) => {
          // Handle image URL - your API returns relative paths like "/uploads/stock-images/..."
          let imageUrl = ""
          if (item.image && item.image.trim() && item.image !== "") {
            imageUrl = item.image.trim()
            // Convert relative path to full URL
            if (!imageUrl.startsWith("https")) {
              imageUrl = `${API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
            }
          }

          console.log(`Product: ${item.itemName}, Original Image: "${item.image}", Final URL: "${imageUrl}"`) // Debug log

          return {
            itemCode: String(item.itemCode || ""),
            itemName: String(item.itemName || ""),
            brand: String(item.brand || ""),
            hsnCode: String(item.hsnCode || ""),
            unitPrice: Number(item.unitPrice || 0),
            unit: String(item.unit || "pcs"),
            description: String(item.description || item.itemName || ""),
            image: imageUrl,
            id: String(item.id || ""),
            // Additional fields from your API
            stockCategory: String(item.stockCategory || ""),
            group: String(item.group || ""),
            category: String(item.category || ""),
          }
        })

        console.log("Transformed products:", transformedProducts) // For debugging

        // Cache the results
        setProductCache((prev) => new Map(prev.set(cacheKey, transformedProducts)))
        setSearchResults((prev) => ({
          ...prev,
          [rowIndex]: transformedProducts,
        }))
      } catch (error) {
        console.error("Error searching products from API:", error)
        // Show user-friendly error message
        setSearchResults((prev) => ({ ...prev, [rowIndex]: [] }))

        // Optional: Show toast notification to user
        // You can add a toast notification here if you have a toast system
      } finally {
        setLoadingSearch((prev) => ({ ...prev, [rowIndex]: false }))
      }
    },
    [productCache, user],
  )

  // Effect for debounced search
  useEffect(() => {
    Object.keys(debouncedSearchTerms).forEach((rowIndex) => {
      const searchTerm = debouncedSearchTerms[rowIndex]
      if (searchTerm && searchTerm.length >= 2) {
        searchProducts(searchTerm, rowIndex)
      }
    })
  }, [debouncedSearchTerms, searchProducts])

  // Load product image from your database (if you have image endpoint)
  const loadProductImage = async (productId, itemIndex) => {
    if (!productId) return

    try {
      const imageResponse = await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
        headers: {
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      })

      if (imageResponse.ok) {
        const imageResult = await imageResponse.json()
        let imageUrl = ""

        if (imageResult.success && imageResult.imageUrl) {
          imageUrl = imageResult.imageUrl
        } else if (imageResult.image) {
          imageUrl = imageResult.image
        } else if (imageResult.data && imageResult.data.imageUrl) {
          imageUrl = imageResult.data.imageUrl
        }

        if (imageUrl) {
          setInvoiceData((prev) => {
            const newItems = [...prev.items]
            if (newItems[itemIndex]) {
              newItems[itemIndex].image = imageUrl
            }
            return { ...prev, items: newItems }
          })
        }
      }
    } catch (error) {
      console.log("Could not load image for product:", productId, error)
    }
  }

  useEffect(() => {
    dispatch(getInvoice(id))
  }, [id, dispatch])

  useEffect(() => {
    const userId = user?.result._id || user?.result?.googleId
    if (userId) {
      dispatch(getClientsByUser({ search: userId }))
    }
  }, [dispatch, user?.result._id, user?.result?.googleId])

  useEffect(() => {
    if (invoice) {
      setInvoiceData(invoice)
      setRates(invoice.rates)
      setClient(invoice.client)
      setType(invoice.type)
      setStatus(invoice.status)
      setSelectedDate(invoice.dueDate)
    }
  }, [invoice])

  useEffect(() => {
    if (type === "Receipt") {
      setStatus("Paid")
    } else {
      setStatus("Unpaid")
    }
  }, [type])

  const selectTallyProduct = useCallback(
    (product, index) => {
      const values = [...invoiceData.items]
      values[index] = {
        ...values[index],
        itemCode: String(product.itemCode || ""),
        brand: String(product.brand || ""), // Make sure brand is properly set
        itemName: String(product.itemName || ""),
        description: String(product.description || product.itemName || ""),
        hsnCode: String(product.hsnCode || ""),
        unitPrice: String(product.unitPrice || "0"),
        unit: String(product.unit || "pcs"),
        discount: String(values[index].discount || "0"),
        image: String(product.image || ""), // Ensure image is saved
        parent: String(product.brand || ""), // Keep parent as fallback
        // Add these additional fields for better compatibility
        itemBrand: String(product.brand || ""),
        itemImage: String(product.image || ""),
        imageUrl: String(product.image || ""),
      }

      const quantity = Number.parseFloat(values[index].quantity) || 1
      const unitPrice = Number.parseFloat(values[index].unitPrice) || 0
      const discount = Number.parseFloat(values[index].discount) || 0

      const discountPercent = Math.min(Math.max(discount, 0), 100)
      const discountAmount = (quantity * unitPrice * discountPercent) / 100
      values[index].amount = Math.max(0, quantity * unitPrice - discountAmount)

      setInvoiceData({ ...invoiceData, items: values })
      setShowSuggestions((prev) => ({ ...prev, [index]: false }))
      setSearchTerms((prev) => ({ ...prev, [index]: String(product.itemName || "") }))

      // Log for debugging
      console.log("Selected product data:", {
        brand: product.brand,
        image: product.image,
        savedItem: values[index],
      })

      if (product.id && !product.image) {
        loadProductImage(product.id, index)
      }
    },
    [invoiceData],
  )

  const unitOptions = ["pcs", "PCS", "Pcs.", "nos", "kg", "ltr", "mtr"]

  const handleRates = (e) => {
    setRates(e.target.value)
    setInvoiceData((prevState) => ({ ...prevState, tax: e.target.value }))
  }

  const handleChange = (index, e) => {
    const values = [...invoiceData.items]
    values[index][e.target.name] = e.target.value

    // Handle item name changes for search
    if (e.target.name === "itemName") {
      setSearchTerms((prev) => ({ ...prev, [index]: e.target.value }))
      setShowSuggestions((prev) => ({
        ...prev,
        [index]: e.target.value.length >= 2,
      }))
    }

    if (["quantity", "unitPrice", "discount"].includes(e.target.name)) {
      const quantity = Number.parseFloat(values[index].quantity) || 0
      const unitPrice = Number.parseFloat(values[index].unitPrice) || 0
      const discount = Number.parseFloat(values[index].discount) || 0

      // Validate inputs
      if (quantity < 0) values[index].quantity = "0"
      if (unitPrice < 0) values[index].unitPrice = "0"
      if (discount < 0) values[index].discount = "0"
      if (discount > 100) values[index].discount = "100"

      // Calculate amount with proper validation
      const validQuantity = Math.max(0, Number.parseFloat(values[index].quantity) || 0)
      const validUnitPrice = Math.max(0, Number.parseFloat(values[index].unitPrice) || 0)
      const validDiscount = Math.min(Math.max(Number.parseFloat(values[index].discount) || 0, 0), 100)

      const discountAmount = (validQuantity * validUnitPrice * validDiscount) / 100
      const calculatedAmount = validQuantity * validUnitPrice - discountAmount

      values[index].amount =
        Number.isFinite(calculatedAmount) && calculatedAmount >= 0 ? Number.parseFloat(calculatedAmount.toFixed(2)) : 0
    }

    setInvoiceData({ ...invoiceData, items: values })
  }

  // Handle image error
  const handleImageError = (index) => {
    const values = [...invoiceData.items]
    values[index].image = ""
    setInvoiceData({ ...invoiceData, items: values })
  }

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== "string") return false
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false

    try {
      // Check for common image extensions
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
      const lowerUrl = trimmedUrl.toLowerCase()
      const hasImageExtension = imageExtensions.some((ext) => lowerUrl.includes(ext))

      if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
        new URL(trimmedUrl)
        return true
      }
      return trimmedUrl.startsWith("/") || trimmedUrl.startsWith("data:image/") || hasImageExtension
    } catch {
      return trimmedUrl.startsWith("/") || trimmedUrl.startsWith("data:image/") || trimmedUrl.includes(".")
    }
  }

  useEffect(() => {
    const calculateSubTotal = () => {
      const subtotal = invoiceData.items.reduce((sum, item) => {
        const amount = Number.parseFloat(item.amount) || 0
        return sum + amount
      }, 0)
      setSubTotal(Math.max(0, subtotal))
    }
    calculateSubTotal()
  }, [invoiceData])

  useEffect(() => {
    const calculateTotal = () => {
      const validSubTotal = Math.max(0, subTotal)
      const validRates = Math.max(0, Number.parseFloat(rates) || 0)
      const taxAmount = (validRates / 100) * validSubTotal
      setVat(taxAmount)
      setTotal(validSubTotal + taxAmount)
    }
    calculateTotal()
  }, [invoiceData, rates, subTotal])

  const handleAddField = (e) => {
    e.preventDefault()
    const newSrNo = invoiceData.items.length + 1
    setInvoiceData((prevState) => ({
      ...prevState,
      items: [
        ...prevState.items,
        {
          srNo: newSrNo,
          itemCode: "",
          brand: "",
          itemName: "",
          description: "",
          hsnCode: "",
          unitPrice: "",
          quantity: "1", // Set default quantity to 1 for new items
          unit: "pcs",
          discount: "",
          amount: "",
          image: "",
          parent: "",
        },
      ],
    }))
  }

  const handleRemoveField = (index) => {
    const values = [...invoiceData.items]
    values.splice(index, 1)

    const renumberedValues = values.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
    }))

    setSearchTerms((prev) => {
      const newTerms = { ...prev }
      delete newTerms[index]
      return newTerms
    })
    setShowSuggestions((prev) => {
      const newShow = { ...prev }
      delete newShow[index]
      return newShow
    })
    setSearchResults((prev) => {
      const newResults = { ...prev }
      delete newResults[index]
      return newResults
    })

    setInvoiceData((prevState) => ({ ...prevState, items: renumberedValues }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (invoice) {
      dispatch(
        updateInvoice(invoice._id, {
          ...invoiceData,
          subTotal: subTotal,
          total: total,
          vat: vat,
          rates: rates,
          currency: currency,
          dueDate: selectedDate,
          client,
          type: type,
          status: status,
        }),
      )
      history.push(`/invoice/${invoice._id}`)
    } else {
      dispatch(
        createInvoice(
          {
            ...invoiceData,
            subTotal: subTotal,
            total: total,
            vat: vat,
            rates: rates,
            currency: currency,
            dueDate: selectedDate,
            client,
            type: type,
            status: status,
            paymentRecords: [],
            creator: [user?.result?._id || user?.result?.googleId],
          },
          history,
        ),
      )
    }
  }

  if (!user) {
    history.push("/login")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar - Dark */}
      <div className="w-20 bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white">
        <form onSubmit={handleSubmit} className="h-full">
          <AddClient setOpen={setOpen} open={open} />

          {/* Header with Customer Selection and Date */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                {client ? (
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold text-gray-900">{client.name}</h4>
                      <p className="text-gray-600">{client.email}</p>
                      <p className="text-gray-600">{client.phone}</p>
                      <p className="text-gray-600">{client.address}</p>
                      <button
                        type="button"
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        onClick={() => setClient(null)}
                      >
                        Change Customer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <select
                      className="border border-gray-300 rounded px-3 py-2 text-sm"
                      required={!invoice}
                      value={client?.name || ""}
                      onChange={(e) => {
                        const selectedClient = clients.find((c) => c.name === e.target.value)
                        setClient(selectedClient)
                      }}
                    >
                      <option value="">Select Customer</option>
                      {clients.map((client, index) => (
                        <option key={index} value={client.name}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      onClick={() => setOpen(true)}
                    >
                      Add New
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-600 font-medium">Date:</span>
                <input
                  type="date"
                  value={moment(selectedDate).format("YYYY-MM-DD")}
                  onChange={(e) => setSelectedDate(new Date(e.target.value).getTime())}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="text-sm text-gray-700 space-y-1">
              <div className="font-medium">Greetings from ATC !!</div>
              <div>This has reference to our personal discussions on your requirements for your upcoming project.</div>
              <div>We are pleased to give our offer as under:</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-6">
            <div className="border border-gray-300 rounded-lg" style={{ overflow: "visible" }}>
              <div className="overflow-x-auto" style={{ overflow: "visible" }}>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Sr.
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        HSN/SAC Code
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoiceData.items.map((itemField, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border-r border-gray-200 px-3 py-4 text-center font-medium">
                          {itemField.srNo || 1}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4">
                          <input
                            type="text"
                            name="brand"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            value={itemField.brand || ""}
                            placeholder="CERA"
                          />
                        </td>
                        <td
                          className="border-r border-gray-200 px-3 py-4 relative"
                          style={{ overflow: "visible", zIndex: 10 }}
                        >
                          <div className="relative">
                            <textarea
                              name="itemName"
                              rows="2"
                              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              onChange={(e) => handleChange(index, e)}
                              onFocus={() => {
                                if (itemField.itemName && itemField.itemName.length >= 2) {
                                  setShowSuggestions((prev) => ({ ...prev, [index]: true }))
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setShowSuggestions((prev) => ({ ...prev, [index]: false }))
                                }, 200)
                              }}
                              value={itemField.itemName || ""}
                              placeholder="Search item name..."
                              id={`itemName-${index}`}
                            />

                            {/* Loading indicator for search */}
                            {loadingSearch[index] && (
                              <div className="absolute right-2 top-2 z-10">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}

                            {showSuggestions[index] && searchResults[index] && searchResults[index].length > 0 && (
                              <div className="suggestions-dropdown absolute z-[9999] top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-xl max-h-64 overflow-y-auto min-w-[450px]">
                                {searchResults[index].map((product, suggestionIndex) => (
                                  <div
                                    key={`${product.id || suggestionIndex}-${suggestionIndex}`}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      selectTallyProduct(product, index)
                                    }}
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div className="flex-shrink-0">
                                        {product.image && isValidImageUrl(product.image) ? (
                                          <img
                                            src={product.image || "/placeholder.svg"}
                                            alt={product.itemName || "Product"}
                                            className="w-12 h-12 object-cover rounded border"
                                            onError={(e) => {
                                              e.target.style.display = "none"
                                              e.target.nextSibling.style.display = "flex"
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xs text-gray-400 rounded border"
                                          style={{
                                            display: product.image && isValidImageUrl(product.image) ? "none" : "flex",
                                          }}
                                        >
                                          No Img
                                        </div>
                                      </div>

                                      {/* Product Details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 mb-1 truncate">
                                          {product.itemName || "Unknown Item"}
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center space-x-2 flex-wrap gap-1">
                                          {product.brand && (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                              {product.brand}
                                            </span>
                                          )}
                                          {product.itemCode && (
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                              Code: {product.itemCode}
                                            </span>
                                          )}
                                          {product.hsnCode && (
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                              HSN: {product.hsnCode}
                                            </span>
                                          )}
                                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                            
                                            {typeof product.unitPrice === "number"
                                              ? product.unitPrice.toFixed(2)
                                              : "0.00"}
                                          </span>
                                          {product.unit && (
                                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                              Unit: {product.unit}
                                            </span>
                                          )}
                                        </div>
                                        {product.description && product.description !== product.itemName && (
                                          <div className="text-xs text-gray-500 mt-1 truncate">
                                            {product.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Show "No results found" message */}
                            {showSuggestions[index] &&
                              searchResults[index] &&
                              searchResults[index].length === 0 &&
                              searchTerms[index] &&
                              searchTerms[index].length >= 2 &&
                              !loadingSearch[index] && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3 text-center text-gray-500 text-sm">
                                  No products found for "{searchTerms[index]}"
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4 text-center">
                          {itemField.image && isValidImageUrl(itemField.image) ? (
                            <img
                              src={itemField.image || "/placeholder.svg"}
                              alt={itemField.itemName || "Product"}
                              className="w-12 h-12 object-cover mx-auto rounded border"
                              onError={() => handleImageError(index)}
                              onLoad={(e) => {
                                if (e.target.naturalWidth === 0) {
                                  handleImageError(index)
                                }
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 mx-auto flex items-center justify-center text-xs text-gray-400 rounded border">
                              No Img
                            </div>
                          )}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4">
                          <input
                            type="text"
                            name="hsnCode"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            value={itemField.hsnCode || ""}
                            placeholder="84818020"
                          />
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4">
                          <input
                            type="number"
                            name="unitPrice"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            value={itemField.unitPrice || ""}
                            placeholder="0"
                            step="0.01"
                          />
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4">
                          <input
                            type="number"
                            name="quantity"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            value={itemField.quantity || "1"} // Default to 1 if empty
                            placeholder="1"
                          />
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4 relative">
                          <select
                            name="unit"
                            value={itemField.unit || "pcs"}
                            onChange={(e) => handleChange(index, e)}
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white" // Added appearance-none and bg-white for better dropdown styling
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4">
                          <input
                            type="number"
                            name="discount"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            value={itemField.discount || ""}
                            placeholder="0"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="border-r border-gray-200 px-3 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {typeof itemField.amount === "number" ? toCommas(itemField.amount) : toCommas(0)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            onClick={() => handleRemoveField(index)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Button */}
              <div className="border-t border-gray-200 p-4 text-center bg-gray-50">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  onClick={handleAddField}
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section with Settings and Summary */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side - Settings */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                    <InvoiceType type={type} setType={setType} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
                    <select
                      value={rates}
                      onChange={handleRates}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => history.goBack()}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="px-6 py-3 border border-blue-300 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      const draftData = {
                        ...invoiceData,
                        subTotal,
                        total,
                        vat,
                        rates,
                        currency,
                        dueDate: selectedDate,
                        client,
                        type,
                        status: "Draft",
                      }
                      localStorage.setItem("invoiceDraft", JSON.stringify(draftData))
                      alert("Invoice saved as draft!")
                    }}
                  >
                    Save as Draft
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={!client || invoiceData.items.length === 0}
                  >
                    {invoice ? "Update Quotation" : "Create Quotation"}
                  </button>
                </div>
              </div>

              {/* Right Side - Summary */}
              <div className="flex justify-end">
                <div className="w-full max-w-sm">
                  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {typeof subTotal === "number" ? toCommas(subTotal) : toCommas(0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">GST ({rates}%):</span>
                      <span className="font-medium text-gray-900">
                        {typeof vat === "number" ? toCommas(vat) : toCommas(0)}
                      </span>
                    </div>

                    <hr className="border-gray-300" />

                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold text-gray-800">Total:</span>
                      <span className="font-bold text-gray-900">
                        {typeof total === "number" ? toCommas(total) : toCommas(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Invoice
