interface SuccessMessageProps {
  orderNumber: string;
}

export default function SuccessMessage({ orderNumber }: SuccessMessageProps) {
  return (
    <div className="bg-green-100 text-green-800 text-sm rounded p-2 mt-4 transition-opacity duration-300 flex justify-center items-center">
      Order No. <span className="text-red-400 font-bold">{orderNumber}</span>{" "}
      {` `} submitted successfully!
    </div>
  );
}
