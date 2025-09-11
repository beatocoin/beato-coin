/// <reference types="react" />
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"

interface AffiliateTransaction {
  id: string
  created_at: string
  amount: number
  status: 'pending' | 'paid'
  customer_email: string
  commission_amount: number
  affiliate_id: string
  affiliate_email: string
  stripe_connected_account_id: string | null
}

export default function AffiliateTransactions() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<AffiliateTransaction[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          return
        }

        setUserId(user.id)

        // Check if user is admin
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
          return
        }

        if (userData?.user_role === 'admin') {
          setIsAdmin(true)
          
          // Get all affiliate transactions for admin
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('affiliate_transactions')
            .select('*')
            .order('created_at', { ascending: false })

          if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError)
            return
          }

          setTransactions(transactionsData || [])
        } else {
          // Get only this user's affiliate transactions
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('affiliate_transactions')
            .select('*')
            .eq('affiliate_id', user.id)
            .order('created_at', { ascending: false })

          if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError)
            return
          }

          setTransactions(transactionsData || [])
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading affiliate data:', error)
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  if (isLoading) {
    return <Loading />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const pendingAmount = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.commission_amount, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Transactions</h1>
          {isAdmin && (
            <p className="text-muted-foreground">
              Total pending payouts: {formatCurrency(pendingAmount)}
            </p>
          )}
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Transaction History</h2>
        </div>
        <div className="p-4">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  {isAdmin && <th className="px-6 py-3">Affiliate</th>}
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Commission</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="px-6 py-4">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && <td className="px-6 py-4">{transaction.affiliate_email}</td>}
                      <td className="px-6 py-4">{transaction.customer_email}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.amount)}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.commission_amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 