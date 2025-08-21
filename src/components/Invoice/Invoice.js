"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import moment from "moment"
import { useHistory } from "react-router-dom"
import { toCommas } from "../../utils/utils"
import axios from "axios"

import { initialState } from "../../initialState"
import currencies from "../../currencies.json"
import { createInvoice, getInvoice, updateInvoice } from "../../actions/invoiceActions"
import { getClientsByUser } from "../../actions/clientActions"
import AddClient from "./AddClient"
import InvoiceType from "./InvoiceType"

// Enhanced initial state with additional fields
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
      quantity: "",
      unit: "pcs",
      discount: "",
      amount: "",
      image: "",
    },
  ],
}

const API_BASE_URL = process.env.REACT_APP_API

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
  const [type, setType] = React.useState("Invoice")
  const [status, setStatus] = useState("")
  const [loadingProduct, setLoadingProduct] = useState({})

  // New state for product suggestions
  const [productSuggestions, setProductSuggestions] = useState({})
  const [loadingSuggestions, setLoadingSuggestions] = useState({})
  const [showSuggestions, setShowSuggestions] = useState({})

  const { id } = useParams()
  const clients = useSelector((state) => state.clients.clients)
  const { invoice } = useSelector((state) => state.invoices)
  const dispatch = useDispatch()
  const history = useHistory()
  const user = JSON.parse(localStorage.getItem("profile"))

  const [open, setOpen] = useState(false)

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

  // Function to fetch product suggestions
  const fetchProductSuggestions = useCallback(async (searchTerm, index) => {
    if (!searchTerm || searchTerm.length < 1) {
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }))
      setShowSuggestions((prev) => ({ ...prev, [index]: false }))
      return
    }

    setLoadingSuggestions((prev) => ({ ...prev, [index]: true }))

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API}/products/search?q=${encodeURIComponent(searchTerm.toUpperCase())}`,
      )
      const suggestions = response.data || []

      setProductSuggestions((prev) => ({ ...prev, [index]: suggestions }))
      setShowSuggestions((prev) => ({ ...prev, [index]: suggestions.length > 0 }))
    } catch (error) {
      console.error("Error fetching product suggestions:", error)
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }))
      setShowSuggestions((prev) => ({ ...prev, [index]: false }))
    } finally {
      setLoadingSuggestions((prev) => ({ ...prev, [index]: false }))
    }
  }, [])

  // Function to fetch product details by code
  const fetchProductByCode = useCallback(
    async (code, index) => {
      if (!code.trim()) {
        alert("Please enter a valid product code.")
        return
      }

      setLoadingProduct((prev) => ({ ...prev, [index]: true }))

      try {
        const response = await axios.get(`${process.env.REACT_APP_API}/product/${code.toUpperCase()}`)
        const product = response.data

        if (!product || !product.itemCode) {
          alert("Product not found. Please check the code.")
          return
        }

        const values = [...invoiceData.items]
        values[index] = {
          ...values[index],
          itemCode: product.itemCode,
          brand: product.brand,
          itemName: product.itemName,
          description: product.description,
          hsnCode: product.hsnCode,
          unitPrice: product.unitPrice,
          unit: product.unit || "pcs",
          discount: product.discount || 0,
          image: product.image ? `${API_BASE_URL}${product.image}` : "",
        }

        // Auto-calculate amount
        const quantity = Number.parseFloat(values[index].quantity) || 1
        const unitPrice = Number.parseFloat(values[index].unitPrice) || 0
        const discount = Number.parseFloat(values[index].discount) || 0
        values[index].amount = quantity * unitPrice - (quantity * unitPrice * discount) / 100

        setInvoiceData({ ...invoiceData, items: values })

        // Hide suggestions after selection
        setShowSuggestions((prev) => ({ ...prev, [index]: false }))
      } catch (error) {
        console.error("Error fetching product:", error)
        alert("Failed to fetch product. Please try again later.")
      } finally {
        setLoadingProduct((prev) => ({ ...prev, [index]: false }))
      }
    },
    [invoiceData],
  )

  // Function to select a product from suggestions
  const selectProductFromSuggestion = useCallback(
    (product, index) => {
      const values = [...invoiceData.items]
      values[index] = {
        ...values[index],
        itemCode: product.itemCode,
        brand: product.brand,
        itemName: product.itemName,
        description: product.description,
        hsnCode: product.hsnCode,
        unitPrice: product.unitPrice,
        unit: product.unit || "pcs",
        discount: product.discount || 0,
        image: product.image,
      }

      // Auto-calculate amount
      const quantity = Number.parseFloat(values[index].quantity) || 1
      const unitPrice = Number.parseFloat(values[index].unitPrice) || 0
      const discount = Number.parseFloat(values[index].discount) || 0
      values[index].amount = quantity * unitPrice - (quantity * unitPrice * discount) / 100

      setInvoiceData({ ...invoiceData, items: values })
      setShowSuggestions((prev) => ({ ...prev, [index]: false }))
    },
    [invoiceData],
  )

  const unitOptions = ["pcs", "PCS", "Pcs.", "nos", "kg", "ltr", "mtr"]

  const handleRates = (e) => {
    setRates(e.target.value)
    setInvoiceData((prevState) => ({ ...prevState, tax: e.target.value }))
  }

  // Enhanced change handler for new fields
  const handleChange = (index, e) => {
    const values = [...invoiceData.items]
    values[index][e.target.name] = e.target.value

    // Handle item code changes for suggestions
    if (e.target.name === "itemCode") {
      fetchProductSuggestions(e.target.value, index)
    }

    // Auto-calculate amount when quantity, price, or discount changes
    if (["quantity", "unitPrice", "discount"].includes(e.target.name)) {
      const quantity = Number.parseFloat(values[index].quantity) || 0
      const unitPrice = Number.parseFloat(values[index].unitPrice) || 0
      const discount = Number.parseFloat(values[index].discount) || 0
      values[index].amount = quantity * unitPrice - (quantity * unitPrice * discount) / 100
    }

    setInvoiceData({ ...invoiceData, items: values })
  }

  // Handle Enter key press on item code field
  const handleKeyPress = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault()
      fetchProductByCode(e.target.value, index)
    }
  }

  // Handle image error
  const handleImageError = (index) => {
    const values = [...invoiceData.items]
    values[index].image = ""
    setInvoiceData({ ...invoiceData, items: values })
  }

  useEffect(() => {
    const calculateSubTotal = () => {
      const subtotal = invoiceData.items.reduce((sum, item) => {
        return sum + (Number.parseFloat(item.amount) || 0)
      }, 0)
      setSubTotal(subtotal)
    }
    calculateSubTotal()
  }, [invoiceData])

  useEffect(() => {
    const calculateTotal = () => {
      const taxAmount = (rates / 100) * subTotal
      setVat(taxAmount)
      setTotal(subTotal + taxAmount)
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
          quantity: "",
          unit: "pcs",
          discount: "",
          amount: "",
          image: "",
        },
      ],
    }))
  }

  const handleRemoveField = (index) => {
    const values = [...invoiceData.items]
    values.splice(index, 1)

    // Renumber the remaining items
    const renumberedValues = values.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
    }))

    // Clear suggestions for removed item
    setProductSuggestions((prev) => {
      const newSuggestions = { ...prev }
      delete newSuggestions[index]
      return newSuggestions
    })
    setShowSuggestions((prev) => {
      const newShow = { ...prev }
      delete newShow[index]
      return newShow
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </button>
        <button className="text-white p-2 hover:bg-gray-700 rounded mt-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
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
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="border-r border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Item Description
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
                      <td className="border-r border-gray-200 px-3 py-4">
                        <div className="relative">
                          <input
                            type="text"
                            name="itemCode"
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleChange(index, e)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            onFocus={() => {
                              if (itemField.itemCode) {
                                fetchProductSuggestions(itemField.itemCode, index)
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions((prev) => ({ ...prev, [index]: false }))
                              }, 200)
                            }}
                            value={itemField.itemCode}
                            placeholder="F1019731"
                            disabled={loadingProduct[index]}
                          />

                          {/* Product Suggestions Dropdown */}
                          {showSuggestions[index] &&
                            productSuggestions[index] &&
                            productSuggestions[index].length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                {productSuggestions[index].map((product, suggestionIndex) => (
                                  <div
                                    key={suggestionIndex}
                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => selectProductFromSuggestion(product, index)}
                                  >
                                    <div className="font-medium text-sm text-gray-900">{product.itemCode}</div>
                                    <div className="text-xs text-gray-500">
                                      {product.brand} - {product.itemName}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4">
                        <input
                          type="text"
                          name="brand"
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => handleChange(index, e)}
                          value={itemField.brand}
                          placeholder="CERA"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4">
                        <textarea
                          name="itemName"
                          rows="2"
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          onChange={(e) => handleChange(index, e)}
                          value={itemField.itemName}
                          placeholder="Item description"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4 text-center">
                        {itemField.image ? (
                          <img
                            src={itemField.image || "/placeholder.svg"}
                            alt={itemField.itemName || "Product"}
                            className="w-12 h-12 object-cover mx-auto rounded border"
                            onError={() => handleImageError(index)}
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
                          value={itemField.hsnCode}
                          placeholder="84818020"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4">
                        <input
                          type="number"
                          name="unitPrice"
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => handleChange(index, e)}
                          value={itemField.unitPrice}
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
                          value={itemField.quantity}
                          placeholder="1"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4">
                        <select
                          name="unit"
                          value={itemField.unit}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4">
                        <input
                          type="number"
                          name="discount"
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => handleChange(index, e)}
                          value={itemField.discount}
                          placeholder="0"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900">₹ {toCommas(itemField.amount || 0)}</span>
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
                    {invoice ? "Update Invoice" : "Create Invoice"}
                  </button>
                </div>
              </div>

              {/* Right Side - Summary */}
              <div className="flex justify-end">
                <div className="w-full max-w-sm">
                  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">₹ {toCommas(subTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">GST ({rates}%):</span>
                      <span className="font-medium text-gray-900">₹ {toCommas(vat)}</span>
                    </div>

                    <hr className="border-gray-300" />

                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold text-gray-800">Total:</span>
                      <span className="font-bold text-gray-900">₹ {toCommas(total)}</span>
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
