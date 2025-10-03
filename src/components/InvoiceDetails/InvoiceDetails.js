"use client"

import { useState, useEffect } from "react"
import { useSnackbar } from "notistack"
import { useLocation, useParams, useHistory } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import axios from "axios"
import { saveAs } from "file-saver"
import moment from "moment"

import { getInvoice } from "../../actions/invoiceActions"
import { toCommas } from "../../utils/utils"
import Spinner from "../Spinner/Spinner"
import Modal from "../Payments/Modal"
import PaymentHistory from "./PaymentHistory"

const InvoiceDetails = () => {
  const location = useLocation()
  const [rates, setRates] = useState(0)
  const [vat, setVat] = useState(0)
  const [currency, setCurrency] = useState("")
  const [subTotal, setSubTotal] = useState(0)
  const [total, setTotal] = useState(0)
  const [client, setClient] = useState([])
  const [status, setStatus] = useState("")
  const [company, setCompany] = useState({})
  // Fixed state initialization for quotation creator
  const [quotationCreator, setQuotationCreator] = useState({ name: '', phone: '' })
  
  const { id } = useParams()
  const { invoice } = useSelector((state) => state.invoices)
  const dispatch = useDispatch()
  const history = useHistory()
  const [sendStatus, setSendStatus] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState(null)
  const [whatsappStatus, setWhatsappStatus] = useState(null) // New state for WhatsApp sending
  const { enqueueSnackbar } = useSnackbar()
  const user = JSON.parse(localStorage.getItem("profile"))
  const [open, setOpen] = useState(false)

  // WhatsApp API configuration
  const WHATSAPP_CONFIG = {
    AUTH_KEY: "ARIHANTXX1ASD",
    INSTANCE_ID: "286857",
    API_URL: "https://wapi.co.in/sendMessage.php"
  }

  useEffect(() => {
    dispatch(getInvoice(id))
  }, [id, dispatch, location])

  useEffect(() => {
    if (invoice) {
      setRates(invoice.rates || 0)
      setClient(invoice.client || {})
      setStatus(invoice.status || "")
      setVat(invoice.vat || 0)
      setCurrency(invoice.currency || "INR")
      setSubTotal(invoice.subTotal || 0)
      setTotal(invoice.total || 0)
      setCompany(invoice?.businessDetails?.data?.data || {})
      
      // Fixed quotation creator data setting - handle all possible cases
      const creatorData = invoice.quotationCreator || {}
      console.log("Invoice quotationCreator data:", creatorData) // Debug log
      
      setQuotationCreator({
        name: creatorData.name || '',
        phone: creatorData.phone || creatorData.mobile || '' // Handle both phone and mobile fields
      })
    }
  }, [invoice])

  // Get the total amount paid
  let totalAmountReceived = 0
  if (invoice?.paymentRecords) {
    for (var i = 0; i < invoice.paymentRecords.length; i++) {
      totalAmountReceived += Number(invoice.paymentRecords[i]?.amountPaid || 0)
    }
  }

  const editInvoice = (id) => {
    history.push(`/edit/invoice/${id}`)
  }

  const getBrandName = (itemField) => {
    return (
      itemField?.brand ||
      itemField?.parent ||
      itemField?.itemBrand ||
      itemField?.brandName ||
      itemField?.manufacturer ||
      ""
    )
  }

  const getImageUrl = (itemField) => {
    const rawImageUrl = itemField?.image || itemField?.itemImage || itemField?.imageUrl || itemField?.img || ""

    if (!rawImageUrl || typeof rawImageUrl !== "string") return ""

    const trimmedUrl = rawImageUrl.trim()
    if (!trimmedUrl) return ""

    if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
      return trimmedUrl
    }

    if (trimmedUrl.startsWith("/")) {
      const API_BASE_URL = process.env.REACT_APP_API || "https://backend.dotcomwebs.shop"
      return `${API_BASE_URL}${trimmedUrl}`
    }

    return trimmedUrl
  }

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== "string") return false
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false

    try {
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

  // Function to format phone number for WhatsApp (ensure it starts with country code)
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null
    
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '')
    
    // If phone starts with 91, return as is
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return cleanPhone
    }
    
    // If phone is 10 digits, add 91 prefix
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`
    }
    
    // If phone already has country code but not 91, return as is
    if (cleanPhone.length > 10) {
      return cleanPhone
    }
    
    return null
  }

  const createAndDownloadPdf = () => {
    setDownloadStatus("loading")
    
    // Use SAME data structure as email and WhatsApp
    const invoiceData = {
      name: invoice.client?.name || "",
      address: invoice.client?.address || "",
      phone: invoice.client?.phone || "",
      email: invoice.client?.email || "",
      dueDate: invoice.dueDate,
      date: invoice.createdAt,
      id: invoice.invoiceNumber || invoice._id, // Use invoiceNumber like email
      notes: invoice.notes,
      subTotal: toCommas(invoice.subTotal),
      total: toCommas(invoice.total),
      type: invoice.type,
      vat: invoice.vat,
      items: invoice.items || [],
      status: invoice.status,
      totalAmountReceived: toCommas(totalAmountReceived),
      balanceDue: toCommas(total - totalAmountReceived),
      company: company,
      quotationCreator: quotationCreator,
    };
  
    axios
      .post(`${process.env.REACT_APP_API}/create-pdf`, invoiceData)
      .then(() => axios.get(`${process.env.REACT_APP_API}/fetch-pdf`, { responseType: "blob" }))
      .then((res) => {
        const pdfBlob = new Blob([res.data], { type: "application/pdf" })
        saveAs(pdfBlob, "ATC_Quotation.pdf")
      })
      .then(() => setDownloadStatus("success"))
      .catch((error) => {
        console.error("PDF creation error:", error)
        setDownloadStatus("error")
      })
  }

  // New function to send PDF via WhatsApp
  const sendPdfViaWhatsApp = async () => {
    const customerPhone = formatPhoneForWhatsApp(invoice.client?.phone)
  
    if (!customerPhone) {
      enqueueSnackbar("Invalid customer phone number for WhatsApp", { variant: "error" })
      return
    }
  
    setWhatsappStatus("loading")
  
    try {
      // Step 1: Prepare invoice data - SAME AS EMAIL
      const invoiceData = {
        name: invoice.client?.name || "",
        address: invoice.client?.address || "",
        phone: invoice.client?.phone || "",
        email: invoice.client?.email || "",
        dueDate: invoice.dueDate,
        date: invoice.createdAt,
        id: invoice.invoiceNumber || invoice._id, // Use invoiceNumber like email does
        notes: invoice.notes,
        subTotal: toCommas(invoice.subTotal),
        total: toCommas(invoice.total),
        type: invoice.type,
        vat: invoice.vat,
        items: invoice.items || [],
        status: invoice.status,
        totalAmountReceived: toCommas(totalAmountReceived),
        balanceDue: toCommas(total - totalAmountReceived),
        company: company,
        quotationCreator: quotationCreator,
      };
  
      console.log('📄 Creating PDF with data:', invoiceData); // Debug log
  
      // Step 2: Create PDF and get public URL from backend
      const pdfResponse = await axios.post(`${process.env.REACT_APP_API}/create-pdf`, invoiceData);
  
      console.log('📄 PDF Response:', pdfResponse.data); // Debug log
  
      if (!pdfResponse.data?.success || !pdfResponse.data?.pdfUrl) {
        throw new Error("Backend did not return PDF URL: " + JSON.stringify(pdfResponse.data))
      }
  
      const pdfUrl = pdfResponse.data.pdfUrl;
      console.log('🔗 PDF URL for WhatsApp:', pdfUrl); // Debug log
  
      // Step 3: Prepare message - More professional
      const message = `Hello ${invoice.client?.name || 'Customer'},
  
  Thank you for your inquiry. Please find attached your quotation from ATC (Arihant Trade Centre).
  
  📋 Quotation Details:
  • Invoice ID: ${invoice.invoiceNumber || invoice._id}
  • Total Amount: ₹${toCommas(total)}
  • Date: ${moment(invoice.createdAt).format("DD-MM-YYYY")}
  ${totalAmountReceived > 0 ? `• Amount Received: ₹${toCommas(totalAmountReceived)}
  • Balance Due: ₹${toCommas(total - totalAmountReceived)}` : ''}
  
  ${quotationCreator?.name ? `Quotation prepared by: ${quotationCreator.name}${quotationCreator?.phone ? ` (${quotationCreator.phone})` : ''}` : ''}
  
  For any queries, please feel free to contact us.
  
  Best regards,
  ATC Team`;
  
      console.log('💬 WhatsApp Message:', message); // Debug log
  
      // Step 4: Send message with PDF via your backend API
      const whatsappPayload = {
        phone: customerPhone,
        message: message,
        pdfUrl: pdfUrl,
        filename: 'ATC_Quotation.pdf'
      };
  
      console.log('📱 Sending WhatsApp payload:', whatsappPayload); // Debug log
  
      const whatsappResponse = await axios.post(
        `${process.env.REACT_APP_API}/api/send-whatsapp`,
        whatsappPayload
      );
  
      console.log('📱 WhatsApp API Response:', whatsappResponse.data); // Debug log
  
      if (whatsappResponse.data?.success) {
        setWhatsappStatus("success")
        enqueueSnackbar(`Quotation sent successfully via WhatsApp to ${customerPhone}!`, { variant: "success" })
      } else {
        throw new Error(`WhatsApp API Error: ${whatsappResponse.data?.error || 'Unknown error'}`)
      }
  
    } catch (error) {
      console.error("❌ WhatsApp send error:", error)
      setWhatsappStatus("error")
      
      // More detailed error message
      let errorMessage = "Failed to send quotation via WhatsApp. ";
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage += error.response.data.details;
      } else {
        errorMessage += error.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: "error" })
    }
  }
  
  

  const sendPdf = (e) => {
    e.preventDefault()
    setSendStatus("loading")
    axios
      .post(`${process.env.REACT_APP_API}/send-pdf`, {
        name: invoice.client?.name || "",
        address: invoice.client?.address || "",
        phone: invoice.client?.phone || "",
        email: invoice.client?.email || "",
        dueDate: invoice.dueDate,
        date: invoice.createdAt,
        id: invoice.invoiceNumber,
        notes: invoice.notes,
        subTotal: toCommas(invoice.subTotal),
        total: toCommas(invoice.total),
        type: invoice.type,
        vat: invoice.vat,
        items: invoice.items || [],
        status: invoice.status,
        totalAmountReceived: toCommas(totalAmountReceived),
        balanceDue: toCommas(total - totalAmountReceived),
        link: `${process.env.REACT_APP_URL}/invoice/${invoice._id}`,
        company: company,
        quotationCreator: quotationCreator, // Use the state value
      })
      .then(() => setSendStatus("success"))
      .catch((error) => {
        console.log(error)
        setSendStatus("error")
      })
  }

  if (!invoice) {
    return <Spinner />
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
        <div className="bg-white">
          {/* Action Buttons */}
          {invoice?.creator?.includes(user?.result?._id || user?.result?.googleId) && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={sendPdf}
                  disabled={sendStatus === "loading"}
                >
                  {sendStatus === "loading" ? "Sending..." : "Send to Email"}
                </button>

                {/* New WhatsApp Send Button */}
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  onClick={sendPdfViaWhatsApp}
                  disabled={whatsappStatus === "loading" || !invoice.client?.phone}
                >
                  {whatsappStatus === "loading" ? (
                    "Sending..."
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      Send via WhatsApp
                    </>
                  )}
                </button>

                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  onClick={createAndDownloadPdf}
                  disabled={downloadStatus === "loading"}
                >
                  {downloadStatus === "loading" ? "Downloading..." : "Download PDF"}
                </button>

                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => editInvoice(invoice._id)}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Quotation
                </button>

             
              </div>

              {/* Status Messages */}
              {whatsappStatus === "success" && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✅ Quotation sent successfully via WhatsApp to {invoice.client?.phone}
                </div>
              )}
              
              {whatsappStatus === "error" && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  ❌ Failed to send quotation via WhatsApp. Please check the phone number and try again.
                </div>
              )}
              
              {!invoice.client?.phone && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                  ⚠️ Customer phone number is required for WhatsApp sending
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {invoice?.paymentRecords?.length > 0 && <PaymentHistory paymentRecords={invoice.paymentRecords} />}

          {/* Payment Modal */}
          <Modal open={open} setOpen={setOpen} invoice={invoice} />

          <div className="bg-white p-8">
            {/* Header with To and Date */}
            <div className="flex justify-between items-start mb-8">
              {/* Left Side - To Section */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4">To,</h2>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">{client?.name || "N/A"}</h3>
                  <p className="text-gray-700">Mo. {client?.phone || "N/A"}</p>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-gray-700">
                    <strong>Greetings from ATC !!</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    This has reference to our personal discussions on your requirements for your upcoming project.
                  </p>
                  <p className="text-sm text-gray-600">We are pleased to give our offer as under:</p>
                </div>
              </div>

              {/* Right Side - Date and Creator Info */}
              <div className="text-right space-y-4">
                <p className="text-gray-700">
                  <strong>Date: {moment(invoice.createdAt || new Date()).format("DD-MM-YYYY")}</strong>
                </p>
                
                {/* Fixed Quotation Creator Display - More robust checking */}
                {(quotationCreator?.name && quotationCreator.name !== '' && quotationCreator.name !== '—') || 
                 (quotationCreator?.phone && quotationCreator.phone !== '' && quotationCreator.phone !== '—') ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Quotation Creator:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {quotationCreator?.name && quotationCreator.name !== '' && quotationCreator.name !== '—' && (
                        <p><span className="font-medium">Name:</span> {quotationCreator.name}</p>
                      )}
                      {quotationCreator?.phone && quotationCreator.phone !== '' && quotationCreator.phone !== '—' && (
                        <p><span className="font-medium">Phone:</span> {quotationCreator.phone}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 border border-gray-300">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white border-b-2 border-gray-300">
                    <tr>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Sr.
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Brand
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Item Description
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Image
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        HSN/SAC Code
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Price
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Quantity
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Unit
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Discount
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                        Warranty
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-bold text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {(invoice?.items || []).map((itemField, index) => {
                      const unitPrice = Number.parseFloat(itemField?.unitPrice || 0)
                      const quantity = Number.parseFloat(itemField?.quantity || 0)
                      const discount = Number.parseFloat(itemField?.discount || 0)
                      const itemAmount = unitPrice * quantity * (1 - discount / 100)

                      return (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            {index + 1}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            {getBrandName(itemField)}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            <div>
                              <div className="font-medium">{itemField?.itemName || itemField?.name || ""}</div>
                              {itemField?.description && (
                                <div className="text-xs text-gray-600 mt-1">{itemField.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 border-r border-gray-200 align-top">
                            <div className="flex items-center justify-center">
                              {(() => {
                                const imageUrl = getImageUrl(itemField)

                                if (imageUrl && isValidImageUrl(imageUrl)) {
                                  return (
                                    <img
                                      src={imageUrl || "/placeholder.svg"}
                                      alt={itemField.itemName || itemField.name || "Product"}
                                      className="w-12 h-12 object-cover rounded border border-gray-300"
                                      onError={(e) => {
                                        console.log(`Image failed to load:`, imageUrl)
                                        e.target.style.display = "none"
                                        if (e.target.nextSibling) {
                                          e.target.nextSibling.style.display = "flex"
                                        }
                                      }}
                                      onLoad={(e) => {
                                        if (e.target.naturalWidth === 0) {
                                          console.log(`Image has no content:`, imageUrl)
                                          e.target.style.display = "none"
                                          if (e.target.nextSibling) {
                                            e.target.nextSibling.style.display = "flex"
                                          }
                                        } else {
                                          console.log(`Image loaded successfully:`, imageUrl)
                                        }
                                      }}
                                    />
                                  )
                                }
                                return null
                              })()}
                              <div
                                className="w-12 h-12 bg-gray-100 border border-gray-300 rounded flex items-center justify-center"
                                style={{
                                  display: (() => {
                                    const imageUrl = getImageUrl(itemField)
                                    return imageUrl && isValidImageUrl(imageUrl) ? "none" : "flex"
                                  })(),
                                }}
                              >
                                <span className="text-xs text-gray-400">No Image</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-300 align-top">
                            {itemField?.hsnCode || itemField?.hsn || "84818020"}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            ₹{unitPrice.toLocaleString()}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top text-center">
                            {itemField?.quantity || ""}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            {itemField?.unit || "pcs"}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            {itemField?.discount || 0}%
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200 align-top">
                            {itemField?.warranty || "No Warranty"}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900 align-top">₹{itemAmount.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between items-center py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-900">Subtotal:</span>
                    <span className="text-sm font-medium text-gray-900">{toCommas(subTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-900">Tax @ {rates}%:</span>
                    <span className="text-sm font-medium text-gray-900">{toCommas(vat)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t-2 border-gray-400">
                    <span className="text-lg font-bold text-gray-900">Final Amount:</span>
                    <span className="text-lg font-bold text-gray-900">{toCommas(total)}</span>
                  </div>

                  {totalAmountReceived > 0 && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-300">
                        <span className="text-sm font-medium text-gray-900">Amount Received:</span>
                        <span className="text-sm font-medium text-green-600">₹{toCommas(totalAmountReceived)}</span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-t-2 border-gray-400">
                        <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                        <span
                          className={`text-lg font-bold ${total - totalAmountReceived > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          ₹{toCommas(total - totalAmountReceived)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Creator Info */}
            <div className="text-center mt-8 pt-6 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-2">
                Thank you for your business! | ATC - Your Trusted Technology Partner
              </p>
              
              {/* Fixed Creator Info in Footer - More robust display */}
              {(quotationCreator?.name && quotationCreator.name !== '' && quotationCreator.name !== '—') || 
               (quotationCreator?.phone && quotationCreator.phone !== '' && quotationCreator.phone !== '—') ? (
                <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-gray-200">
                  <p>
                    Quotation prepared by:{" "}
                    {quotationCreator?.name && quotationCreator.name !== '' && quotationCreator.name !== '—' && (
                      <span className="font-medium">{quotationCreator.name}</span>
                    )}
                    {quotationCreator?.name && quotationCreator.name !== '' && quotationCreator.name !== '—' && 
                     quotationCreator?.phone && quotationCreator.phone !== '' && quotationCreator.phone !== '—' && " | "}
                    {quotationCreator?.phone && quotationCreator.phone !== '' && quotationCreator.phone !== '—' && (
                      <span>Contact: {quotationCreator.phone}</span>
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetails