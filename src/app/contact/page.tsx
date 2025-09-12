"use client"

import { useState } from "react"
import { useTheme } from "@/contexts/ThemeContext"

export default function ContactPage() {
  const { colors } = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
    alert('Thank you for your message! We will get back to you soon.')
    setIsModalOpen(false)
    setFormData({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.pageBackground }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 
              className="text-4xl md:text-5xl font-bold mb-6"
              style={{ color: colors.primary }}
            >
              Contact Us
            </h1>
            <p 
              className="text-base md:text-lg leading-relaxed"
              style={{ color: colors.dark }}
            >
              Have questions about Beato Coin or need assistance? We're here to help! 
              You can reach out to us with any questions you may have about our water 
              tokenization platform, purchasing Beato Coins, or general inquiries.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Contact Information */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: colors.secondary,
                borderColor: colors.primary + '20'
              }}
            >
              <h2 
                className="text-2xl font-semibold mb-4"
                style={{ color: colors.primary }}
              >
                Get in Touch
              </h2>
              <p 
                className="mb-4 text-sm"
                style={{ color: colors.dark }}
              >
                For general inquiries, support, or business partnerships, please contact us through our main website.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-block px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{ 
                  backgroundColor: colors.accent1,
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent2
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent1
                }}
              >
                Contact Us
              </button>
            </div>

            {/* Beato Agent */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: colors.secondary,
                borderColor: colors.primary + '20'
              }}
            >
              <h2 
                className="text-2xl font-semibold mb-4"
                style={{ color: colors.primary }}
              >
                Instant Answers
              </h2>
              <p 
                className="mb-4 text-sm"
                style={{ color: colors.dark }}
              >
                For quick answers to common questions about Beato Coin, our platform, 
                or water tokenization, try our AI-powered Beato Agent for instant assistance.
              </p>
              <a
                href="/agent?agent_id=993c5e39-7d9a-42d5-ba05-00132c0df14d"
                className="inline-block px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{ 
                  backgroundColor: colors.accent2,
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent1
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent2
                }}
              >
                Chat with Beato Agent
              </a>
            </div>
          </div>

          {/* Additional Information */}
          <div 
            className="text-center p-6 rounded-lg"
            style={{ backgroundColor: colors.secondary }}
          >
            <h3 
              className="text-xl font-semibold mb-3"
              style={{ color: colors.primary }}
            >
              Why Choose Beato Coin?
            </h3>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: colors.dark }}
            >
              Beato Coin represents the future of water security by tokenizing your water supply. 
              Each token represents a case of water that you can redeem when needed, ensuring 
              your water inventory is always ready and available.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.secondary }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: colors.primary }}
                >
                  Contact Us
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label 
                    htmlFor="name" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.dark }}
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: colors.primary + '40',
                    }}
                  />
                </div>

                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.dark }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: colors.primary + '40',
                    }}
                  />
                </div>

                <div>
                  <label 
                    htmlFor="subject" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.dark }}
                  >
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: colors.primary + '40',
                    }}
                  />
                </div>

                <div>
                  <label 
                    htmlFor="message" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.dark }}
                  >
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none"
                    style={{ 
                      borderColor: colors.primary + '40',
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border rounded-lg font-semibold transition-colors"
                    style={{ 
                      borderColor: colors.primary,
                      color: colors.primary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary + '10'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-colors"
                    style={{ backgroundColor: colors.accent1 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.accent2
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.accent1
                    }}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
