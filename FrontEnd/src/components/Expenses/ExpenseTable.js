import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Button, Form as BootstrapForm } from "react-bootstrap";
import "../../css/ExpenseTable.css";
import { useOnboardingState } from "../../Hooks/useOnboardingState";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// Utility function to format the date
const money_format = (value) => {

  return value.toLocaleString("en-US", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  });

};

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Utility function to decode byte array to string
const decodeByteArray = (byteArray) => {
  return String.fromCharCode(...byteArray);
};

// Fetch all transactions from API
async function fetchAllTransactions(token, user_id, start_date, end_date) {
  try {
    // console.log(
    //   `Fetching transactions with user_id=${user_id}, token=${token}, start_date=${start_date}, end_date=${end_date}`
    // );
    const response = await fetch(
      process.env.REACT_APP_API_HOST+`/api/transactions/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          user_id: user_id,
          token: token,
          start_date: start_date,
          end_date: end_date,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
     console.log("Fetched data:", data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }
}

// Delete transaction by ID
async function deleteTransactionById(user_id, token, id) {
  try {
    // console.log(
    //   `Fetching transactions with user_id=${user_id}, token=${token}, transaction_id=${id}`
    // );
    const response = await fetch(
      process.env.REACT_APP_API_HOST+`/api/transaction/`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: token,
          user_id: user_id,
          transaction_id: id,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return null;
  }
}

export const ExpenseTable = ({ startDate, endDate, category }) => {
  const { currentUser } = useAuth();
  const token = currentUser?.token;
  const user_id = currentUser?.id;

  const [state, setState] = useOnboardingState();
  const navigate = useNavigate();
  // state to edit/delete each item
  const [transactions, setTransactions] = useState(
    state.transactions || [{ id: 1 }]
  );
  // state for viewing each item
  const [showModal, setShowModal] = useState(false);
  const [viewableTransaction, setViewableTransaction] = useState(null);
  // state for table sorting based on selected table header column
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "descending",
  });

  useEffect(() => {
    if (token && user_id && startDate && endDate) {
      async function loadTransactions() {
        const fetchedTransactions = await fetchAllTransactions(
          token,
          user_id,
          startDate,
          endDate
        );
        const formattedTransactions = fetchedTransactions.map(
          (transaction) => ({
            id: transaction.transaction_id,
            transaction_date: transaction.transaction_date
              ? formatDate(transaction.transaction_date)
              : "",
            transaction_category: transaction.transaction_category || "",
            transaction_name: transaction.transaction_payee || "",
            transaction_note: transaction.transaction_note || "",
            transaction_amount: transaction.transaction_amount || 0,
            transaction_type: transaction.transaction_type || "",
            transaction_image_url: transaction.transaction_image_url
              ? decodeByteArray(transaction.transaction_image_url.data)
              : "",
          })
        );
        // Sort by date & id in descending order
        const sortedFormattedTransactions = formattedTransactions.sort(
          (a, b) => {
            if (b.transaction_date === a.transaction_date) {
              return b.id - a.id;
            }
            return b.transaction_date - a.transaction_date;
          }
        );

        setTransactions(sortedFormattedTransactions);
      }
      loadTransactions();
    }
  }, [token, user_id, startDate, endDate]);

  // Filter transactions based on the selected category
  const filteredTransactions =
    category === "All categories" || category === ""
      ? transactions
      : transactions.filter(
          (transaction) => transaction.transaction_category === category
        );
  // Sorting table items
  const sortedTransactions = [...filteredTransactions];
  if (sortConfig.key !== null) {
    sortedTransactions.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      } else if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }
  // Changing sort directions
  const handleSort = (key) => {
    let direction = "descending";
    if (sortConfig.key === key && sortConfig.direction === "descending") {
      direction = "ascending";
    }
    setSortConfig({ key, direction });
  };
 
  
  const handleViewClick = (transaction) => {
    setViewableTransaction(transaction);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setViewableTransaction(null);
  };

  const handleEditClick = (id) => {
    navigate(`/home/transactions/${id}`);
  };

  const handleDeleteClick = (transaction_id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3A3B3C",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteTransactionById(user_id, token, transaction_id);
          const updatedTransactions = transactions.filter(
            (transaction) => transaction.id !== transaction_id
          );
          setTransactions(updatedTransactions);
          setState({ ...state, transactions: updatedTransactions });
        } catch (error) {
          Swal.fire(
            "Error",
            "Failed to delete goal from the database",
            "error"
          );
        }
      }
    });
  };
  
  return (
    <>
      <div className="scrollable-table">
        <table className="responsive-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort("transaction_date")}
                style={{ cursor: "pointer" }}
              >
                <div>
                  Date
                  {sortConfig.key === "transaction_date" ? (
                    sortConfig.direction === "ascending" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        class="bi bi-caret-up-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        class="bi bi-caret-down-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    )
                  ) : null}
                </div>
              </th>
              <th
                onClick={() => handleSort("transaction_category")}
                style={{ cursor: "pointer" }}
              ><div>
                Category
                {sortConfig.key === "transaction_category" ? (
                  sortConfig.direction === "ascending" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="bi bi-caret-up-fill"
                      viewBox="0 0 16 16"
                    >
                      <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="bi bi-caret-down-fill"
                      viewBox="0 0 16 16"
                    >
                      <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                    </svg>
                  )
                ) : null}</div>
              </th>
              <th
                onClick={() => handleSort("transaction_name")}
                style={{ cursor: "pointer" }}
              >
                <div>
                  Name
                  {sortConfig.key === "transaction_name" ? (
                    sortConfig.direction === "ascending" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-up-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-down-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    )
                  ) : null}
                </div>
              </th>
              <th
                onClick={() => handleSort("transaction_note")}
                style={{ cursor: "pointer" }}
              >
                <div>
                  Note
                  {sortConfig.key === "transaction_note" ? (
                    sortConfig.direction === "ascending" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-up-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-down-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    )
                  ) : null}
                </div>
              </th>
              <th
                onClick={() => handleSort("transaction_amount")}
                style={{ cursor: "pointer", textAlign: "right" }}
              >
                <div>
                  Amount
                  {sortConfig.key === "transaction_amount" ? (
                    sortConfig.direction === "ascending" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-up-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-caret-down-fill"
                        viewBox="0 0 16 16"
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    )
                  ) : null}
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((data) => (
              <tr key={data.id} className={(data.transaction_amount < 0 )?'negative':'positive'}>
                <td data-label="Date">{data.transaction_date}</td>
                <td data-label="Category">{data.transaction_category}</td>
                <td data-label="Name">{data.transaction_name}</td>
                <td data-label="Note">{data.transaction_note}</td>
                <td
                  data-label="Amount"
                  className={data.transaction_amount > 0 ? "plus" : "minus"}
                >
                  ${money_format(parseFloat(data.transaction_amount))}
                </td>

                <td data-label="">
                  <div className="icons">
                    <a href="#/" onClick={() => handleViewClick(data)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-arrow-up-right-square"
                        viewBox="0 0 16 16"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm5.854 8.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707z"
                        />
                      </svg>
                    </a>
                    <a href="#/" onClick={() => handleEditClick(data.id)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-pencil-square"
                        viewBox="0 0 16 16"
                      >
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                        <path
                          fill-rule="evenodd"
                          d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"
                        />
                      </svg>
                    </a>
                    <a href="#/" onClick={() => handleDeleteClick(data.id)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-trash3"
                        viewBox="0 0 16 16"
                      >
                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5" />
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {viewableTransaction && (
          <Modal show={showModal} onHide={handleModalClose}>
            <Modal.Header closeButton>
              <Modal.Title>View Transaction</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <BootstrapForm>
                <BootstrapForm.Group controlId="transactionDate">
                  <BootstrapForm.Label>Date</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="date"
                    defaultValue={viewableTransaction.transaction_date}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionCategory">
                  <BootstrapForm.Label>Category</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    defaultValue={viewableTransaction.transaction_category}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionName">
                  <BootstrapForm.Label>Name</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    defaultValue={viewableTransaction.transaction_name}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionNote">
                  <BootstrapForm.Label>Note</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    defaultValue={viewableTransaction.transaction_note}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionAmount">
                  <BootstrapForm.Label>Amount</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="number"
                    defaultValue={viewableTransaction.transaction_amount}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionType">
                  <BootstrapForm.Label>Type</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    defaultValue={viewableTransaction.transaction_type}
                    readOnly
                  />
                </BootstrapForm.Group>
                <BootstrapForm.Group controlId="transactionImageURL">
                  <BootstrapForm.Label>Image</BootstrapForm.Label>
                  {viewableTransaction.transaction_image_url && (
                    <div className="transaction-image">
                      <img
                        src={viewableTransaction.transaction_image_url}
                        alt="Transaction"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>
                  )}
                </BootstrapForm.Group>
              </BootstrapForm>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </>
  );
};
