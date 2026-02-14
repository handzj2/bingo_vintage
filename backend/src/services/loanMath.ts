export function calculateWeeklySchedule(principal: number, rate: number, weeks: number) {
  // 1. FIX: You must define and initialize the array first!
  const scheduleArray = []; 
  
  let remainingBalance = principal;
  
  // 2. Porting your logic from schedules.py
  for (let i = 1; i <= weeks; i++) {
    // Basic interest calculation (adjust this based on your specific formula)
    const interest = remainingBalance * (rate / 100);
    
    // 3. Add the row to your list
    scheduleArray.push({
      week: i,
      interest: Number(interest.toFixed(2)),
      balance: Number(remainingBalance.toFixed(2))
    });

    // Note: You may want to subtract principal from remainingBalance here 
    // to reflect the "Reducing Balance" logic from your Python code.
  }

  // 4. Now the return will work because scheduleArray exists!
  return scheduleArray; 
}