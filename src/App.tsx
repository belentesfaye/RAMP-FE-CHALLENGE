import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  

  // const transactions = useMemo(
  //   () => {
  //     if (transactionsByEmployee) {
  //       return transactionsByEmployee;
  //     }
  //     return paginatedTransactions?.data ?? null;
  //   },
  //   [paginatedTransactions, transactionsByEmployee]
  // )

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    await transactionsByEmployeeUtils.invalidateData();

    const selected = await Promise.all(employees?.map((employee) => {
      return transactionsByEmployeeUtils.fetchById(employee.id);
    }) ?? []);
    const selectedMap: { [key: string]: any } = {}; // Add type annotation

    selected.forEach((trans, index) => {
      if (employees) { // Handle null case
        selectedMap[employees[index].id] = trans;
      }
    });

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    } 
  }, [employeeUtils.loading, employees, loadAllTransactions])

  useEffect(() => {
    return setTransactions(paginatedTransactions?.data ?? transactionsByEmployee ?? [])
  }, [paginatedTransactions, transactionsByEmployee]);

  const toggleTransaction = (transactionId: string) => {
    setTransactions((prevTransactions) =>
      prevTransactions.map((transaction) =>
        transaction.id === transactionId ? { ...transaction, approved: !transaction.approved } : transaction
      )
    );
  };

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeeUtils.loading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null || newValue === EMPTY_EMPLOYEE) {
              await loadAllTransactions();
            } else {
              await loadTransactionsByEmployee(newValue.id);
            }
          }}          
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} 
          onToggleTransaction={toggleTransaction} 
          />

          {paginatedTransactions?.data && paginatedTransactions.nextPage !== null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
