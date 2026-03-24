export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-dark p-10 max-w-md w-full text-center animate-fade-in">
        <svg className="mx-auto mb-6 text-[#c9a96e]" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-2">Payment Successful</p>
        <h1 className="text-2xl font-light text-[#f5f5f5] mb-4">Thank You!</h1>
        <hr className="divider" />
        <p className="text-[#9ca3af] mt-6 leading-relaxed">Your purchase has been confirmed. A download link has been sent to your email address.</p>
        <p className="text-[#6b7280] text-sm mt-3">Please check your inbox (and spam folder) for an email from FoculPoint Photography.</p>
        <a href="/" className="btn-gold inline-block mt-8">Return to Gallery</a>
      </div>
    </div>
  );
}
