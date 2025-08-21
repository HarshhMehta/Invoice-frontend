"use client"

import { useState, useEffect } from "react"
import { useSnackbar } from 'notistack'
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
  const { id } = useParams()
  const { invoice } = useSelector((state) => state.invoices)
  const dispatch = useDispatch()
  const history = useHistory()
  const [sendStatus, setSendStatus] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState(null)
  const { enqueueSnackbar } = useSnackbar()
  const user = JSON.parse(localStorage.getItem("profile"))
  const [open, setOpen] = useState(false)

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

  // Handle image error
  const handleImageError = (e) => {
    e.target.style.display = "none"
    if (e.target.nextSibling) {
      e.target.nextSibling.style.display = "flex"
    }
  }

  const createAndDownloadPdf = () => {
    setDownloadStatus("loading")
    axios
      .post(`${process.env.REACT_APP_API}/create-pdf`, {
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
        company: company,
      })
      .then(() => axios.get(`${process.env.REACT_APP_API}/fetch-pdf`, { responseType: "blob" }))
      .then((res) => {
        const pdfBlob = new Blob([res.data], { type: "application/pdf" })
        saveAs(pdfBlob, "invoice.pdf")
      })
      .then(() => setDownloadStatus("success"))
      .catch((error) => {
        console.error("PDF creation error:", error)
        setDownloadStatus("error")
      })
  }

  // SEND PDF INVOICE VIA EMAIL
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
      })
      .then(() => setSendStatus("success"))
      .catch((error) => {
        console.log(error)
        setSendStatus("error")
      })
  }

  // If no invoice data, show spinner
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
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
        <div className="bg-white">
          {/* Action Buttons */}
          {invoice?.creator?.includes(user?.result?._id || user?.result?.googleId) && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex space-x-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={sendPdf}
                  disabled={sendStatus === "loading"}
                >
                  {sendStatus === "loading" ? "Sending..." : "Send to Customer"}
                </button>

                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                  Edit Invoice
                </button>

                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  Follow up
                </button>
              </div>
            </div>
          )}

          {/* Payment History */}
          {invoice?.paymentRecords?.length > 0 && <PaymentHistory paymentRecords={invoice.paymentRecords} />}

          {/* Payment Modal */}
          <Modal open={open} setOpen={setOpen} invoice={invoice} />

          {/* Header Section with Logo */}
          <div className="bg-white p-6 border-b border-gray-200">
            <div className="flex justify-center">
              <img src="/assets/logo.jpeg" alt="Company Logo" className="h-20 w-auto object-contain" />
            </div>
          </div>

          {/* Invoice Content */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-8">
              {/* Left Side - Greeting and Bill To */}
              <div className="w-1/2">
                <div className="mb-6">
                  <p className="text-gray-700 mb-2">
                    Greetings from <strong>ATC</strong> !!
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    This has reference to our personal discussions on your requirements for your upcoming project.
                  </p>
                  <p className="text-sm text-gray-600">We are pleased to give our offer as under:</p>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bill To:</h3>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-900">{client?.name || "N/A"}</h4>
                  <p className="text-gray-600">{client?.email || "N/A"}</p>
                  <p className="text-gray-600">{client?.phone || "N/A"}</p>
                  <p className="text-gray-600">{client?.address || "N/A"}</p>
                </div>
              </div>

              {/* Right Side - Date */}
              <div className="text-right">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-500 text-sm font-medium">Date:</span>
                    <span className="text-gray-900 font-medium">
                      {moment(invoice.createdAt || new Date()).format("MMM Do YYYY")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        Sr.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        HSN/SAC
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Disc(%)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(invoice?.items || []).map((itemField, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{itemField?.srNo || index + 1}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-900">{itemField?.itemCode || ""}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-900">{itemField?.brand || ""}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <span className="text-sm font-medium text-gray-900 block" title={itemField?.itemName}>
                              {itemField?.itemName || ""}
                            </span>
                            {itemField?.description && (
                              <span className="text-xs text-gray-500 block mt-1">{itemField.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center h-12">
                            {itemField?.image ? (
                              <>
                                <img
                                  src={itemField.image || "/placeholder.svg"}
                                  alt={itemField.itemName || "Product"}
                                  className="w-12 h-12 object-cover rounded border border-gray-300"
                                  onError={handleImageError}
                                />
                                <div
                                  className="w-12 h-12 bg-gray-100 border border-gray-300 rounded flex items-center justify-center"
                                  style={{ display: "none" }}
                                >
                                  <span className="text-xs text-gray-400">No Image</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400">No Image</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-900">{itemField?.hsnCode || ""}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">{itemField?.quantity || ""}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-900">{itemField?.unit || "pcs"}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm text-gray-900">
                            ₹ {Number.parseFloat(itemField?.unitPrice || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm text-gray-900">{itemField?.discount || 0}%</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            ₹ {toCommas(itemField?.amount || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-md">
                <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h3>

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
                    <span className="font-bold text-red-600">
                      {currency} {toCommas(total)}
                    </span>
                  </div>

                  {totalAmountReceived > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount Received:</span>
                        <span className="font-medium text-green-600">₹ {toCommas(totalAmountReceived)}</span>
                      </div>

                      <hr className="border-gray-300" />
                    </>
                  )}

                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-800">Balance Due:</span>
                    <span
                      className={`font-bold ${total - totalAmountReceived > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {currency} {toCommas(total - totalAmountReceived)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Footer */}
            <div className="bg-gray-800 text-white p-6 rounded-lg text-center">
              <p className="mb-2">Thank you for your business!</p>
              <p className="text-sm text-gray-300">
                ATC - Your Trusted Technology Partner | Email: info@atc.com | Phone: +91-XXXXXXXXXX
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetails
