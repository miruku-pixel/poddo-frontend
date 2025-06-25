import React, { useState, useEffect, type ChangeEvent } from "react";

// Define the PHP Printer URL as a module-level constant
const PHP_PRINTER_URL: string = "http://localhost:8000/print.php";

// Main component for thermal printer testing
const ThermalPrinterTester: React.FC = () => {
  // State to hold the text to be sent to the printer
  const [printText, setPrintText] = useState<string>("");
  // State to manage the loading/printing status of the button
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  // State for the inline status message (e.g., "Print Successful!")
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  // State for the type of status message ('success' or 'error')
  const [statusMessageType, setStatusMessageType] = useState<
    "success" | "error"
  >("success");

  // Effect to automatically clear the status message after a few seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null); // Clear the message
      }, 5000); // Message visible for 5 seconds

      // Cleanup function to clear the timer if the component unmounts or message changes
      return () => clearTimeout(timer);
    }
  }, [statusMessage]); // Dependency array: rerun this effect when statusMessage changes

  // Handler for changes in the text area input
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrintText(e.target.value);
  };

  // Function to handle the print button click
  const handlePrint = async () => {
    // Prevent printing if there's no text or if a print job is already in progress
    if (!printText.trim() || isPrinting) {
      setStatusMessage("Please enter text to print.");
      setStatusMessageType("error");
      return;
    }

    setIsPrinting(true); // Set printing state to true
    setStatusMessage(null); // Clear any previous status message

    try {
      // Send the print text to the PHP printer driver
      const response = await fetch(PHP_PRINTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: printText }), // Send the current text from the input
      });

      // Parse the JSON response from the PHP script
      const data: { success?: boolean; error?: string; message?: string } =
        await response.json();

      if (response.ok) {
        // If the server responded with a success status (2xx)
        setStatusMessage("Print Successful!");
        setStatusMessageType("success");
        setPrintText(""); // Optionally clear the text area after successful print
        console.log("Server response:", data);
      } else {
        // If the server responded with an error status (e.g., 4xx, 5xx)
        setStatusMessage(
          `Print Failed: ${data.error || data.message || response.statusText}`
        );
        setStatusMessageType("error");
        console.error("Server error response:", data);
      }
    } catch (error) {
      // Catch any network errors (e.g., server not reachable, CORS issues)
      console.error("Error connecting to printer server:", error);
      setStatusMessage(
        `Could not connect to printer server. Ensure it's running at ${PHP_PRINTER_URL}`
      );
      setStatusMessageType("error");
    } finally {
      setIsPrinting(false); // Reset printing state regardless of success or failure
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative">
        {/* Inline Status Message Display */}
        {statusMessage && (
          <div
            className={`absolute top-0 left-0 right-0 p-3 text-center rounded-t-lg transition-all duration-300 ease-in-out z-10
              ${
                statusMessageType === "success" ? "bg-green-600" : "bg-red-600"
              } text-white font-semibold`}
            role="status"
          >
            {statusMessage}
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center mt-8">
          {" "}
          {/* Added mt-8 for spacing below status message */}
          Thermal Printer Test
        </h1>

        <div className="mb-4">
          <label
            htmlFor="printTextInput"
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Text to Print:
          </label>
          <textarea
            id="printTextInput"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-y"
            placeholder="Enter text to test your thermal printer..."
            value={printText}
            onChange={handleTextChange}
            disabled={isPrinting} // Disable textarea while printing
          ></textarea>
        </div>

        <button
          onClick={handlePrint}
          disabled={isPrinting || !printText.trim()} // Disable button if printing or text is empty
          className={`w-full py-3 px-4 rounded-lg text-white font-bold transition duration-300 ${
            isPrinting || !printText.trim()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          }`}
        >
          {isPrinting ? "Sending to Printer..." : "Print Text"}
        </button>

        <div className="mt-8 text-gray-600 text-sm text-center">
          <p>
            This tool sends the entered text to your local PHP printer driver
            for testing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrinterTester;
