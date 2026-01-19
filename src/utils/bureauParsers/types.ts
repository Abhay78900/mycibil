/**
 * Bureau Response Parser Types
 * 
 * Common types and interfaces for parsing bureau-specific responses
 * and mapping them to the unified credit report format.
 */

import { UnifiedCreditReport } from '@/types/creditReport';

// ============= Common Helper Types =============

export interface ParsedBureauResult {
  success: boolean;
  unifiedReport: UnifiedCreditReport | null;
  rawData: any;
  error?: string;
  bureauName: string;
}

export interface BureauParserContext {
  reportId: string;
  fullName: string;
  panNumber: string;
  dateOfBirth?: string;
  gender?: string;
  mobileNumber?: string;
}

// ============= CIBIL Response Types =============

export interface CibilRawResponse {
  CreditReport?: {
    Header?: {
      ReportNumber?: string;
      ReportDate?: string;
      ReportTime?: string;
      Version?: string;
    };
    NameSegment?: {
      Name?: string;
      DateOfBirth?: string;
      Gender?: string;
    };
    IDSegment?: Array<{
      IDType?: string;
      IDNumber?: string;
      IssueDate?: string;
      ExpirationDate?: string;
    }>;
    TelephoneSegment?: Array<{
      TelephoneNumber?: string;
      TelephoneType?: string;
      TelephoneExtension?: string;
    }>;
    EmailSegment?: Array<{
      EmailAddress?: string;
    }>;
    AddressSegment?: Array<{
      Address?: string;
      State?: string;
      City?: string;
      PinCode?: string;
      AddressCategory?: string;
      DateReported?: string;
      ResidenceCode?: string;
    }>;
    EmploymentSegment?: Array<{
      AccountType?: string;
      DateReported?: string;
      OccupationCode?: string;
      Income?: string;
      NetGrossIndicator?: string;
      MonthlyAnnualIndicator?: string;
    }>;
    Account?: Array<{
      AccountNumber?: string;
      Institution?: string;
      AccountType?: string;
      OwnershipIndicator?: string;
      DateOpened?: string;
      DateClosed?: string;
      DateReported?: string;
      HighCreditAmount?: string;
      CreditLimit?: string;
      CurrentBalance?: string;
      AmountOverdue?: string;
      RateOfInterest?: string;
      RepaymentTenure?: string;
      EMIAmount?: string;
      PaymentFrequency?: string;
      ActualPaymentAmount?: string;
      LastPaymentDate?: string;
      SuitFiledStatus?: string;
      CreditFacilityStatus?: string;
      WrittenOffAmount?: string;
      WrittenOffPrincipalAmount?: string;
      SettlementAmount?: string;
      ValueOfCollateral?: string;
      TypeOfCollateral?: string;
      PaymentHistory?: string; // 36-month history encoded
      PaymentHistoryStartDate?: string;
      PaymentHistoryEndDate?: string;
    }>;
    Enquiry?: Array<{
      DateOfEnquiry?: string;
      EnquiringMemberName?: string;
      EnquiryPurpose?: string;
      EnquiryAmount?: string;
    }>;
    Score?: {
      Score?: number;
      ScoreType?: string;
      ScoreName?: string;
      ScoreCardName?: string;
      ScoreCardVersion?: string;
      ReasonCodes?: string[];
    };
    AccountsSummary?: {
      NumberOfAccounts?: number;
      NumberOfActiveAccounts?: number;
      NumberOfWriteOffs?: number;
      TotalBalanceAmount?: number;
      TotalSanctionedAmount?: number;
      TotalCreditLimit?: number;
      TotalMonthlyPaymentAmount?: number;
    };
  };
  // Alternative structure
  data?: any;
  status?: string;
  message?: string;
}

// ============= Experian Response Types =============

export interface ExperianRawResponse {
  ABORESSION?: {
    HEADER?: {
      REPORTID?: string;
      DATEPROCESSED?: string;
      TIMEPROCESSED?: string;
      PRODUCT?: string;
    };
    CONSUMERSECTION?: {
      NAME?: {
        CONSUMERNAME1?: string;
        CONSUMERNAME2?: string;
        DATEOFBIRTH?: string;
        GENDER?: string;
        AGE?: number;
      };
      IDS?: Array<{
        IDTYPE?: string;
        IDNUMBER?: string;
      }>;
      ADDRESSES?: Array<{
        ADDRESS?: string;
        CITY?: string;
        STATE?: string;
        PINCODE?: string;
        ADDRESSTYPE?: string;
        DATEREPORTED?: string;
      }>;
      TELEPHONES?: Array<{
        TELEPHONETYPE?: string;
        TELEPHONENUMBER?: string;
      }>;
      EMAILS?: Array<{
        EMAIL?: string;
      }>;
    };
    ACCOUNTSECTION?: Array<{
      ACCOUNTNUMBER?: string;
      SUBSCRIBERNAME?: string;
      ACCOUNTTYPE?: string;
      OWNERSHIPTYPE?: string;
      DATEOPENED?: string;
      DATECLOSED?: string;
      DATEREPORTED?: string;
      SANCTIONEDAMOUNT?: number;
      CURRENTBALANCE?: number;
      AMOUNTOVERDUE?: number;
      RATEOFINTEREST?: number;
      TENURE?: number;
      EMIAMOUNT?: number;
      LASTPAYMENTDATE?: string;
      ACCOUNTSTATUS?: string;
      WRITTENOFFAMOUNT?: number;
      SETTLEMENTAMOUNT?: number;
      SUITFILED?: string;
      PAYMENTHISTORY?: string;
      PAYMENTSTARTDATE?: string;
      PAYMENTENDDATE?: string;
    }>;
    ENQUIRYSECTION?: Array<{
      ENQUIRYDATE?: string;
      SUBSCRIBERNAME?: string;
      ENQUIRYPURPOSE?: string;
      ENQUIRYAMOUNT?: number;
    }>;
    SCORE?: {
      SCORE?: number;
      SCORETYPE?: string;
    };
    SUMMARY?: {
      TOTALACCOUNTS?: number;
      ACTIVEACCOUNTS?: number;
      CLOSEDACCOUNTS?: number;
      TOTALBALANCE?: number;
      TOTALSANCTIONED?: number;
      TOTALOVERDUE?: number;
    };
  };
  // Alternative structure
  data?: any;
  status?: string;
  success?: boolean;
}

// ============= Equifax Response Types =============

export interface EquifaxRawResponse {
  CCRResponse?: {
    CIRReportData?: {
      IDAndContactInfo?: {
        PersonalInfo?: {
          Name?: {
            FullName?: string;
            FirstName?: string;
            MiddleName?: string;
            LastName?: string;
          };
          DateOfBirth?: string;
          Gender?: string;
          Age?: number;
        };
        IdentityInfo?: {
          PANId?: Array<{
            IdNumber?: string;
            ReportedDate?: string;
          }>;
          VoterId?: Array<{
            IdNumber?: string;
          }>;
          PassportId?: Array<{
            IdNumber?: string;
          }>;
          DriverLicense?: Array<{
            IdNumber?: string;
          }>;
        };
        PhoneInfo?: Array<{
          Number?: string;
          TypeCode?: string;
        }>;
        EmailInfo?: Array<{
          EmailAddress?: string;
        }>;
        AddressInfo?: Array<{
          Address?: string;
          City?: string;
          State?: string;
          Postal?: string;
          Type?: string;
          DateReported?: string;
        }>;
      };
      RetailAccountDetails?: Array<{
        AccountNumber?: string;
        Institution?: string;
        AccountType?: string;
        OwnershipType?: string;
        Open?: string;
        DateOpened?: string;
        DateClosed?: string;
        DateReported?: string;
        HighCredit?: number;
        CreditLimit?: number;
        Balance?: number;
        AmountPastDue?: number;
        Rate?: number;
        Tenure?: number;
        InstallmentAmount?: number;
        LastPaymentDate?: string;
        AccountStatus?: string;
        WriteOffAmount?: number;
        SettlementAmount?: number;
        SuitFiled?: string;
        History48Months?: string;
      }>;
      InquiryHistory?: Array<{
        DateOfInquiry?: string;
        InquiringMember?: string;
        InquiryPurpose?: string;
        InquiryAmount?: number;
      }>;
      ScoreDetails?: Array<{
        Score?: number;
        Type?: string;
        Version?: string;
      }>;
      AccountSummary?: {
        TotalAccounts?: number;
        ActiveAccounts?: number;
        ClosedAccounts?: number;
        CurrentBalance?: number;
        SecuredAmount?: number;
        UnsecuredAmount?: number;
        TotalPastDue?: number;
        MostSevereStatusWithin24Months?: string;
      };
    };
  };
  // Alternative structure
  data?: any;
  status?: string;
  error?: string;
}

// ============= CRIF Response Types =============

export interface CrifRawResponse {
  data?: {
    credit_score?: number;
    creditScore?: number;
    first_name?: string;
    last_name?: string;
    pan?: string;
    mobile?: string;
    credit_report?: {
      HEADER?: {
        'REPORT-ID'?: string;
        'DATE-OF-ISSUE'?: string;
        VERSION?: string;
      };
      'PERSONAL-INFO-VARIATION'?: {
        'DATE-OF-BIRTH-VARIATIONS'?: {
          VARIATION?: any;
        };
        'ADDRESS-VARIATIONS'?: {
          VARIATION?: any;
        };
        'PHONE-NUMBER-VARIATIONS'?: {
          VARIATION?: any;
        };
        'EMAIL-VARIATIONS'?: {
          VARIATION?: any;
        };
      };
      'EMPLOYMENT-DETAILS'?: {
        'EMPLOYMENT-DETAIL'?: {
          'ACCT-TYPE'?: string;
          'DATE-REPORTED'?: string;
          OCCUPATION?: string;
          INCOME?: string;
          'INCOME-FREQUENCY'?: string;
          'INCOME-INDICATOR'?: string;
        };
      };
      RESPONSES?: {
        RESPONSE?: Array<{
          'LOAN-DETAILS'?: {
            'ACCT-NUMBER'?: string;
            'CREDIT-GUARANTOR'?: string;
            'ACCT-TYPE'?: string;
            'OWNERSHIP-IND'?: string;
            'DISBURSED-DT'?: string;
            'CLOSED-DATE'?: string;
            'DATE-REPORTED'?: string;
            'DISBURSED-AMT'?: string;
            'CURRENT-BAL'?: string;
            'OVERDUE-AMT'?: string;
            'INTEREST-RATE'?: string;
            'REPAYMENT-TENURE'?: string;
            'ACTUAL-PAYMENT'?: string;
            'LAST-PAYMENT-DATE'?: string;
            'ACCOUNT-STATUS'?: string;
            'WRITE-OFF-AMT'?: string;
            'PRINCIPAL-WRITE-OFF-AMT'?: string;
            'SETTLEMENT-AMT'?: string;
          };
        }>;
      };
      'INQUIRY-HISTORY'?: {
        HISTORY?: any;
      };
      'ACCOUNTS-SUMMARY'?: {
        'PRIMARY-ACCOUNTS-SUMMARY'?: {
          'PRIMARY-NUMBER-OF-ACCOUNTS'?: number;
          'PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS'?: number;
          'PRIMARY-CLOSED-NUMBER-OF-ACCOUNTS'?: number;
          'PRIMARY-CURRENT-BALANCE'?: number;
          'PRIMARY-SANCTIONED-AMOUNT'?: number;
          'PRIMARY-OVERDUE-AMOUNT'?: number;
        };
      };
    };
  };
  status?: string;
  success?: boolean;
  message?: string;
}

// ============= Bureau Type Union =============

export type BureauRawResponse = CibilRawResponse | ExperianRawResponse | EquifaxRawResponse | CrifRawResponse;

export type BureauType = 'cibil' | 'experian' | 'equifax' | 'crif';
