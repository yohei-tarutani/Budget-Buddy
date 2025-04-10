import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import styled from "styled-components";
import { useAuth } from "../../contexts/AuthContext";
import { Box } from '@mui/system';
import { Field } from '../DashboardParts/Field';
import { Input } from '../DashboardParts/Input';
import { useNavigate } from 'react-router-dom';
import "../../css/DatePickers.css";

// Fetch expenditures from the backend
const fetchExpenditures = async (user_id, token, start_date, end_date) => {
  try {
    const response = await fetch(
      process.env.REACT_APP_API_HOST+`/api/dashboard/expendituresbycategory/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: token,
          user_id: user_id,
          start_date: start_date,
          end_date: end_date,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch expenditures:", error);
    return [];
  }
}

export const ExpendituresByCategory = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { currentUser } = useAuth();
  const token = currentUser?.token;
  const user_id = currentUser?.id;

  const [expenditures, setExpenditures] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formattedFirstDay = firstDay.toISOString().split('T')[0];
    const formattedLastDay = lastDay.toISOString().split('T')[0];

    setStartDate(formattedFirstDay);
    setEndDate(formattedLastDay);
  }, []);

  useEffect(() => {
    if (token && user_id && startDate && endDate) {
      async function loadExpenditures() {
        const fetchedExpenditures = await fetchExpenditures(user_id, token, startDate, endDate);
        const formattedExpenditures = fetchedExpenditures.map((expenditure) => ({
          budget_name: expenditure.budget_name || '',
          expense: expenditure.expense || 0,
        }));
        setExpenditures(formattedExpenditures);
      }
      loadExpenditures();
    }
  }, [token, user_id, startDate, endDate]);

  const handleNavigate = () => {
    navigate("/home/budget/incomes-bm");
  };

  // divide the data into labels and series
  const labels = expenditures.map((data) => data.budget_name);
  const series = expenditures.map((data) => data.expense);

  const total = series.reduce((a, b) => a + b, 0);
  let noDataCheckFlag = total === 0 ? true : false;

  const options = {
    chart: {
      type: "donut",
      redrawOnParentResize: true,
      height: '100px',
      toolbar: {
        show: false,
      },
    },
    labels: labels,
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center'
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: function (val, opts) {
          const total = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const percentage = ((val / total) * 100).toFixed(2);
          return `${percentage}%`;
        }
      }
    },
    colors: ['#005D5D', '#1192E8', '#520408', '#6929C4', '#9F1853', '#FA4D56'],
    plotOptions: {
      donut: {
        size: '200',
      }
    }
  };

  return (
    <StyledExpendituresByCategory>
      <StyledTitle>Expenditures By Category</StyledTitle>
      {noDataCheckFlag ? (
        <StyledNoDataWrapper>
          <StyledNoDataMessage>No Expenses.</StyledNoDataMessage>
          <StyledNoDataMessage>Let's create new transactions.</StyledNoDataMessage>
          <StyledButton
            type="button"
            onClick={handleNavigate}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem" }}
          >
            {"+ "}Create transactions
          </StyledButton>
        </StyledNoDataWrapper>
      ) : (
        <>
          <StyledBox className="date-pickers">
            <Field label="Start date">
              <StyledInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="End date">
              <StyledInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </StyledBox>
          <ReactApexChart options={options} series={series} type="donut" />
        </>
      )}
    </StyledExpendituresByCategory >
  );
};

const StyledExpendituresByCategory = styled.div`
  grid-column: 2 / 3;
  grid-row: 3 / 4;
  border: 1px solid #fff;
  border-radius: 5px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  padding: 1rem;
`;

const StyledInput = styled(Input)`
  width: 90%;
  border-radius: 5px;
  border: 1px solid #ced4da;
  padding: 0 0.5rem;
`;

const StyledTitle = styled.h4`
  font-weight: bold;
  margin-bottom: 1rem;
`;

const StyledBox = styled(Box)`
  margin-bottom: 0.5rem;
`;

const StyledNoDataWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
`;

const StyledNoDataMessage = styled.p`
  font-size: 1.1rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0;
`;

const StyledButton = styled.button`
  margin-top: 1rem;
`;
