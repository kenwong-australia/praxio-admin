import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: ABN Lookup
 * 
 * Validates an ABN using the Australian Business Register (ABR) API
 * 
 * Environment variable required: ABR_AUTHENTICATION_GUID
 * 
 * Request body:
 * - abn: 11-digit ABN number (string)
 * 
 * Returns:
 * - success: boolean
 * - valid: boolean (if ABN is valid)
 * - businessName: string (if found)
 * - error: string (if error occurred)
 */
export async function POST(request: NextRequest) {
  try {
    // Get ABR authentication GUID from environment variables
    const authGuid = process.env.ABR_AUTHENTICATION_GUID;
    
    if (!authGuid) {
      console.error('ABR_AUTHENTICATION_GUID environment variable is not set');
      return NextResponse.json(
        { 
          success: false, 
          valid: false,
          error: 'ABR authentication not configured. Please set ABR_AUTHENTICATION_GUID environment variable.' 
        },
        { status: 500 }
      );
    }

    // Get ABN from request body
    const body = await request.json();
    const { abn } = body;

    if (!abn) {
      return NextResponse.json(
        { success: false, valid: false, error: 'ABN is required' },
        { status: 400 }
      );
    }

    // Validate ABN format (11 digits)
    const abnDigits = abn.replace(/\D/g, '');
    if (abnDigits.length !== 11) {
      return NextResponse.json(
        { success: false, valid: false, error: 'ABN must be 11 digits' },
        { status: 400 }
      );
    }

    // Call ABR API using HTTP GET (simpler than SOAP)
    const abrUrl = `https://abr.business.gov.au/ABRXMLSearch/AbrXmlSearch.asmx/SearchByABNv202001`;
    const params = new URLSearchParams({
      searchString: abnDigits,
      includeHistoricalDetails: 'N',
      authenticationGuid: authGuid,
    });

    const response = await fetch(`${abrUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`ABR API returned status ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse XML response using regex (simple approach for Node.js)
    // Extract business name from common XML tags
    const businessNameMatch = xmlText.match(/<(?:legalName|mainName|organisationName|entityName|entityNameOfEntityType)>([^<]+)<\/(?:legalName|mainName|organisationName|entityName|entityNameOfEntityType)>/i);
    const businessName = businessNameMatch ? businessNameMatch[1].trim() : null;

    // Check for errors in response
    const hasError = /<exception/i.test(xmlText) || /<error/i.test(xmlText);
    
    // Check if entity type exists (indicates valid ABN)
    const hasEntityType = /<entityType/i.test(xmlText);
    
    // ABN is valid if we have business details and no errors
    const isValid = !hasError && (businessName !== null || hasEntityType);

    return NextResponse.json({
      success: true,
      valid: isValid,
      businessName: businessName,
      abn: abnDigits,
    });

  } catch (error) {
    console.error('ABN lookup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during ABN lookup'
      },
      { status: 500 }
    );
  }
}

