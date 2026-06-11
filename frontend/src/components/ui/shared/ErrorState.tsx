interface ErrorStateProps {
  message?: string
}

export default function ErrorState({ message = 'An error occurred' }: ErrorStateProps) {
  return (
    <div>
      <p>{message}</p>
    </div>
  )
}