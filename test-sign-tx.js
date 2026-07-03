const { Keypair, TransactionBuilder, BASE_FEE, xdr } = require('@stellar/stellar-sdk');

// Remove newlines from XDR
const unsignedXdr = 'AAAAAgAAAAARE3sg5JG6yZJPLX5Ss4+ttUhhyaRMWRhsMw9u32eTHwAAAGQAM6JdAAAAJAAAAAEAAAAAAAAAAAAAAABqR1wQAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABPh7VnHWJ9DE4e7pWhp8nqH8hQZ7c1xstk5oK9j8l7uAAAAAMdmVyaWZ5X3Byb29mAAAAAwAAAA4AAAAJYWdlLXByb29mAAAAAAAADQAAAQAAoxCVCK1KGNl6LWskJbh0BchgLUnvMR/u4KeWonaUcgwS5HE1Al1Eaq3l6nIkxz4DY9UDt6cXq+6ttQxNnJ3PDxUJSzGs5E2yIZCDfYL8vfcAVU75Duz4j9pXDOb2xtAAnUuApMTOpdgsJYnli/973GjvUvovd6iqMkEC5cL/0y9+lDTuvGeqdUnAQTZjuF+7EVxAk+NgIOxga3mlIevZBAYGwnBZfofwUGd4o9l2I+jfzAdENv0vGvvwDGnazdwR1MDT4/+NaDtMfXvQddyZlf+UWaaURju9Fz4eYq+z7jAS5Xfoz7on719KXCTlYCXrsh7D037ueIhfsESk3uDpAAAAEAAAAAEAAAABAAAADQAAACAAAAAAAAAAAAAAAAAAAAAA';
const secret = 'SAMSUUXUXFCQOPIAN7JGKFZNMSMII7CL4G6U2667G4Y4HQYISY2RCTYJ';
const networkPassphrase = 'Test SDF Network ; September 2015';

console.log('Unsigned XDR length:', unsignedXdr.length);
console.log('Unsigned XDR:', unsignedXdr);

try {
  // Try to parse the XDR
  const txEnvelope = xdr.TransactionEnvelope.fromXDR(unsignedXdr, 'base64');
  console.log('Parsed XDR successfully');
  console.log('Transaction type:', txEnvelope.switch().name);
  
  const keypair = Keypair.fromSecret(secret);
  const tx = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase);
  tx.sign(keypair);

  const signedXdr = tx.toXDR();
  console.log('Signed XDR:');
  console.log(signedXdr);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
