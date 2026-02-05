interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export default function Button({ children, onClick, type = 'button' }: ButtonProps) {
  return (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  )
}