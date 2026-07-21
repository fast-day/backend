{
  services: booked.map(book => ({
    service_id: book.service!.id,
    price: book.service!.prices.price,
    count: 1,
    date: book.date!,
    start_time: book.time!,
    duration: book.service!.duration,
    
    users: book.employee?.id ? [{
      id: book.employee.id,
      first_name: book.employee.first_name,
      last_name: book.employee.last_name,
    }] : [],
  })),

  customers: customer ? [{
    id: customer.id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
  }] : [],

  location_id,
  comment: null,
  status: "new" | "pending" | "expired" | "confirmed" | "cancelled" | "completed",
  type: "online" | "offline"
}