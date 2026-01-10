// Mock Credit Report Data - Following CIBIL PDF Format (Puran Mal Tank Report Template)
import { UnifiedCreditReport } from '@/types/creditReport';

export const mockPuranMalTankReport: UnifiedCreditReport = {
  header: {
    bureau_name: 'TransUnion CIBIL',
    control_number: '9895814552',
    report_date: '2025-11-11',
    credit_score: 721
  },
  personal_information: {
    full_name: 'PURAN MAL TANK',
    date_of_birth: '1980-04-28',
    gender: 'Male',
    identifications: [
      {
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: 'AGCPT9342A',
        issue_date: null,
        expiration_date: null
      },
      {
        type: 'VoterId',
        number: 'RJ/19/125/0652000',
        issue_date: null,
        expiration_date: null
      },
      {
        type: 'DriversLicenseId',
        number: 'RJ-35/DLC/10/14432',
        issue_date: null,
        expiration_date: null
      },
      {
        type: 'RationCardId',
        number: '1791/660/3',
        issue_date: null,
        expiration_date: null
      }
    ]
  },
  contact_information: {
    addresses: [
      {
        address: 'S/O GOPI LAL SIYAKHEDI S/O GOPI LAL SIYAKHEDI VILL SIYAKHEDI TEH CHOTISADRI CHOTISADRI DIS PRATAPGARH CHITTORGARH, Rajasthan, 312605',
        category: 'Permanent Address',
        status: '-',
        date_reported: '2024-04-30'
      },
      {
        address: 'VPO SIYA KHEDI CHHOTI SADRI PRATAPGARH RAJASTHAN CHHOTI SADRI, Rajasthan, 312604',
        category: 'Residence Address',
        status: 'Rented',
        date_reported: '2024-01-16'
      },
      {
        address: 'WARD NO 09 SIYAKHEDI POST SIYAKHEDI CHHOTI SADRI, Rajasthan, 312604',
        category: 'Permanent Address',
        status: '-',
        date_reported: '2024-01-16'
      },
      {
        address: '312616, CHITTORGARH, RAJASTHAN, Rajasthan, 312616',
        category: 'Residence Address',
        status: '-',
        date_reported: '2020-01-20'
      }
    ],
    phone_numbers: [
      { type: 'Mobile Phone', number: '9799080639' },
      { type: 'Office Phone', number: '9799080639' },
      { type: 'Not Classified', number: '09799080639' },
      { type: 'Home Phone', number: '014789799080639' }
    ],
    email_addresses: []
  },
  employment_information: [
    {
      account_type: 'Gold Loan',
      date_reported: '2025-08-15',
      occupation: 'Salaried',
      income: '-',
      frequency: '-',
      income_indicator: '-'
    }
  ],
  accounts: [
    {
      member_name: 'CAPRI GLOB',
      account_type: 'Gold Loan',
      account_number: '30100024648751',
      ownership: 'Individual',
      credit_limit: '-',
      sanctioned_amount: '1101022',
      current_balance: '1099659',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '24.00',
      repayment_tenure: '12',
      emi_amount: '67245',
      payment_frequency: 'Half yearly',
      actual_payment_amount: '-',
      dates: {
        date_opened: '2025-07-18',
        date_closed: null,
        date_of_last_payment: null,
        date_reported: '2025-10-31'
      },
      payment_start_date: '2025-07-01',
      payment_end_date: '2025-10-01',
      payment_history: [
        {
          year: 2025,
          months: {
            jan: '', feb: '', mar: '', apr: '',
            may: '', jun: '', jul: '0', aug: '0',
            sep: '0', oct: '0', nov: '', dec: ''
          }
        }
      ],
      collateral: {
        value: '1101022',
        type: 'Gold',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    },
    {
      member_name: 'MUTHOOTNAN',
      account_type: 'Other',
      account_number: '3350MDL00002646',
      ownership: 'Individual',
      credit_limit: '-',
      sanctioned_amount: '239200',
      current_balance: '0',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '24.00',
      repayment_tenure: '12',
      emi_amount: '-',
      payment_frequency: '-',
      actual_payment_amount: '239200',
      dates: {
        date_opened: '2025-04-10',
        date_closed: '2025-07-14',
        date_of_last_payment: '2025-07-14',
        date_reported: '2025-07-31'
      },
      payment_start_date: '2025-04-01',
      payment_end_date: '2025-07-01',
      payment_history: [
        {
          year: 2025,
          months: {
            jan: '', feb: '', mar: '', apr: '0',
            may: '0', jun: '0', jul: '0', aug: '',
            sep: '', oct: '', nov: '', dec: ''
          }
        }
      ],
      collateral: {
        value: '239200',
        type: 'Gold',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    },
    {
      member_name: 'MUTHOOTNAN',
      account_type: 'Other',
      account_number: '3350MDL00002534',
      ownership: 'Individual',
      credit_limit: '-',
      sanctioned_amount: '174800',
      current_balance: '0',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '24.00',
      repayment_tenure: '12',
      emi_amount: '-',
      payment_frequency: '-',
      actual_payment_amount: '174800',
      dates: {
        date_opened: '2025-01-18',
        date_closed: '2025-04-10',
        date_of_last_payment: '2025-04-10',
        date_reported: '2025-04-30'
      },
      payment_start_date: '2025-01-01',
      payment_end_date: '2025-04-01',
      payment_history: [
        {
          year: 2025,
          months: {
            jan: '0', feb: '0', mar: '0', apr: '0',
            may: '', jun: '', jul: '', aug: '',
            sep: '', oct: '', nov: '', dec: ''
          }
        }
      ],
      collateral: {
        value: '175250',
        type: 'Gold',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    },
    {
      member_name: 'AMARCPL',
      account_type: 'Two-wheeler Loan',
      account_number: 'ACPL035092',
      ownership: 'Guarantor',
      credit_limit: '-',
      sanctioned_amount: '66500',
      current_balance: '0',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '11.18',
      repayment_tenure: '12',
      emi_amount: '6161',
      payment_frequency: 'Monthly',
      actual_payment_amount: '73923',
      dates: {
        date_opened: '2024-05-01',
        date_closed: '2025-04-30',
        date_of_last_payment: '2025-04-27',
        date_reported: '2025-04-30'
      },
      payment_start_date: '2024-05-01',
      payment_end_date: '2025-04-01',
      payment_history: [
        {
          year: 2025,
          months: {
            jan: '0', feb: 'XXX', mar: '0', apr: '0',
            may: '', jun: '', jul: '', aug: '',
            sep: '', oct: '', nov: '', dec: ''
          }
        },
        {
          year: 2024,
          months: {
            jan: '', feb: '', mar: '', apr: '',
            may: '0', jun: '0', jul: '0', aug: '0',
            sep: '0', oct: '0', nov: '0', dec: '0'
          }
        }
      ],
      collateral: {
        value: '-',
        type: '-',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    },
    {
      member_name: 'TCL',
      account_type: 'Commercial Vehicle Loan',
      account_number: '5000060383',
      ownership: 'Individual',
      credit_limit: '-',
      sanctioned_amount: '450000',
      current_balance: '0',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '-',
      repayment_tenure: '-',
      emi_amount: '-',
      payment_frequency: '-',
      actual_payment_amount: '-',
      dates: {
        date_opened: '2007-01-27',
        date_closed: '2011-07-28',
        date_of_last_payment: '2010-10-26',
        date_reported: '2012-12-31'
      },
      payment_start_date: '2008-08-01',
      payment_end_date: '2011-07-01',
      payment_history: [
        {
          year: 2011,
          months: {
            jan: '151', feb: '179', mar: '210', apr: '240',
            may: '271', jun: '301', jul: '0', aug: '',
            sep: '', oct: '', nov: '', dec: ''
          }
        },
        {
          year: 2010,
          months: {
            jan: '29', feb: '26', mar: '29', apr: '28',
            may: '29', jun: '28', jul: '59', aug: '60',
            sep: '59', oct: '59', nov: '89', dec: '120'
          }
        },
        {
          year: 2009,
          months: {
            jan: '29', feb: '26', mar: 'XXX', apr: '0',
            may: 'XXX', jun: '0', jul: '0', aug: '29',
            sep: '28', oct: '29', nov: '28', dec: '29'
          }
        },
        {
          year: 2008,
          months: {
            jan: '', feb: '', mar: '', apr: '',
            may: '', jun: '', jul: '', aug: '0',
            sep: 'XXX', oct: '90', nov: '28', dec: 'XXX'
          }
        }
      ],
      collateral: {
        value: '-',
        type: '-',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    },
    {
      member_name: 'SBI',
      account_type: '(BLPS-SB) Business Loan – Priority Sector – Small Business',
      account_number: '10236-0061041056304',
      ownership: 'Individual',
      credit_limit: '-',
      sanctioned_amount: '50000',
      current_balance: '0',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '-',
      repayment_tenure: '60',
      emi_amount: '1383',
      payment_frequency: '-',
      actual_payment_amount: '-',
      dates: {
        date_opened: '2008-02-18',
        date_closed: '2013-08-31',
        date_of_last_payment: '2012-09-28',
        date_reported: '2014-07-15'
      },
      payment_start_date: '2010-09-01',
      payment_end_date: '2013-08-01',
      payment_history: [
        {
          year: 2013,
          months: {
            jan: 'STD', feb: 'XXX', mar: 'SUB', apr: 'SUB',
            may: 'SUB', jun: 'SUB', jul: 'SUB', aug: '0',
            sep: '', oct: '', nov: '', dec: ''
          }
        },
        {
          year: 2012,
          months: {
            jan: '', feb: '', mar: '', apr: '',
            may: '', jun: '', jul: '', aug: '',
            sep: '', oct: '', nov: '', dec: 'STD'
          }
        }
      ],
      collateral: {
        value: '-',
        type: '-',
        suit_filed: '-',
        credit_facility_status: '-',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    }
  ],
  enquiries: [
    { member_name: 'MAHINDRA FINANCE', date_of_enquiry: '2025-10-25', enquiry_purpose: 'Loan Against Shares/Securities' },
    { member_name: 'BOI', date_of_enquiry: '2025-10-16', enquiry_purpose: 'Other' },
    { member_name: 'CHOLA INVST FIN', date_of_enquiry: '2025-10-13', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'HDFC BANK', date_of_enquiry: '2025-10-11', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'BOB', date_of_enquiry: '2025-09-26', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'BOB', date_of_enquiry: '2025-09-26', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'BOB', date_of_enquiry: '2025-09-25', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'BOB', date_of_enquiry: '2025-09-24', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'AU SFB', date_of_enquiry: '2025-09-24', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'BOI', date_of_enquiry: '2025-09-24', enquiry_purpose: 'Other' },
    { member_name: 'TOYOTAFIN', date_of_enquiry: '2025-09-23', enquiry_purpose: 'Auto Loan (Personal)' },
    { member_name: 'AU SFB', date_of_enquiry: '2025-06-24', enquiry_purpose: 'Two-wheeler Loan' },
    { member_name: 'PIRAMALFIN', date_of_enquiry: '2024-07-19', enquiry_purpose: 'Housing Loan' },
    { member_name: 'AU SFB', date_of_enquiry: '2024-06-01', enquiry_purpose: 'Business Loan - Secured' },
    { member_name: 'SHRIRAM HFC', date_of_enquiry: '2024-05-14', enquiry_purpose: 'Housing Loan' },
    { member_name: 'SBI', date_of_enquiry: '2024-05-09', enquiry_purpose: 'Other' },
    { member_name: 'SBI', date_of_enquiry: '2024-05-09', enquiry_purpose: 'Other' },
    { member_name: 'CAPRI GLOB', date_of_enquiry: '2024-04-25', enquiry_purpose: 'Property Loan' },
    { member_name: 'CAPRI GLOB', date_of_enquiry: '2024-04-15', enquiry_purpose: 'Property Loan' },
    { member_name: 'BAJAJ FIN LTD', date_of_enquiry: '2023-06-13', enquiry_purpose: 'Consumer Loan' },
    { member_name: 'SBI', date_of_enquiry: '2023-04-21', enquiry_purpose: 'Other' }
  ],
  summary: {
    total_accounts: 6,
    active_accounts: 1,
    closed_accounts: 5,
    total_overdue_amount: 0,
    total_sanctioned_amount: 2081522,
    total_current_balance: 1099659
  }
};

// Function to generate mock report data based on the Puran Mal Tank template
export function generateMockReportFromTemplate(
  fullName: string,
  panNumber: string,
  dateOfBirth: string,
  gender: string,
  score: number
): UnifiedCreditReport {
  return {
    ...mockPuranMalTankReport,
    header: {
      ...mockPuranMalTankReport.header,
      credit_score: score,
      report_date: new Date().toISOString().split('T')[0],
      control_number: Math.random().toString().slice(2, 12)
    },
    personal_information: {
      ...mockPuranMalTankReport.personal_information,
      full_name: fullName.toUpperCase(),
      date_of_birth: dateOfBirth,
      gender: gender,
      identifications: [
        {
          type: 'INCOME TAX ID NUMBER (PAN)',
          number: panNumber.toUpperCase(),
          issue_date: null,
          expiration_date: null
        }
      ]
    }
  };
}

export default mockPuranMalTankReport;
