import random
import string

def generate_password(length=12):
    """
    Generate a secure random password
    
    Args:
        length (int): Length of the password (default: 12)
    
    Returns:
        str: Generated password
    """
    # Define character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Ensure at least one character from each set
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(special)
    ]
    
    # Fill the rest with random characters from all sets
    all_characters = lowercase + uppercase + digits + special
    password += [random.choice(all_characters) for _ in range(length - 4)]
    
    # Shuffle to avoid predictable patterns
    random.shuffle(password)
    
    return ''.join(password)
