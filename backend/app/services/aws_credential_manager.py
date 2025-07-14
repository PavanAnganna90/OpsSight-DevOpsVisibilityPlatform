"""
AWS Credential Management Service.
Provides secure storage and access to AWS credentials.
"""

import logging
import base64
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.aws_cost import AwsAccount

logger = logging.getLogger(__name__)


@dataclass
class AwsCredentials:
    """AWS credential data structure"""

    access_key_id: str
    secret_access_key: str
    region: str
    session_token: Optional[str] = None


class CredentialEncryptionError(Exception):
    """Custom exception for credential encryption errors"""

    pass


class AwsCredentialManager:
    """
    Secure AWS credential management service.

    Provides encryption, storage, and retrieval of AWS credentials with
    secure fallbacks to environment variables.
    """

    def __init__(self, db: Session, encryption_key: Optional[str] = None):
        """
        Initialize the credential manager.

        Args:
            db: Database session for storing encrypted credentials
            encryption_key: Optional encryption key, will use default if not provided
        """
        self.db = db
        self.logger = logging.getLogger(__name__)
        self._cipher_suite = self._initialize_encryption(encryption_key)

    def _initialize_encryption(self, encryption_key: Optional[str] = None) -> Fernet:
        """
        Initialize encryption cipher suite.

        Args:
            encryption_key: Optional encryption key

        Returns:
            Fernet cipher suite instance

        Raises:
            CredentialEncryptionError: If encryption initialization fails
        """
        try:
            if encryption_key:
                # Use provided key
                key = encryption_key.encode()
            else:
                # Generate key from environment or default
                password = os.getenv(
                    "AWS_CREDENTIAL_ENCRYPTION_KEY", "opssight-default-key"
                ).encode()
                salt = os.getenv("AWS_CREDENTIAL_SALT", "opssight-salt").encode()

                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(password))

            return Fernet(key)
        except Exception as e:
            self.logger.error(f"Failed to initialize encryption: {str(e)}")
            raise CredentialEncryptionError(
                f"Encryption initialization failed: {str(e)}"
            )

    def store_aws_credentials(
        self,
        account_id: int,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        session_token: Optional[str] = None,
    ) -> bool:
        """
        Store AWS credentials securely in the database.

        Args:
            account_id: AWS account database ID
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            region: AWS region
            session_token: Optional session token for temporary credentials

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get the AWS account record
            aws_account = (
                self.db.query(AwsAccount).filter(AwsAccount.id == account_id).first()
            )

            if not aws_account:
                self.logger.error(f"AWS account with ID {account_id} not found")
                return False

            # Encrypt credentials
            encrypted_access_key = self._encrypt_credential(access_key_id)
            encrypted_secret_key = self._encrypt_credential(secret_access_key)
            encrypted_session_token = None

            if session_token:
                encrypted_session_token = self._encrypt_credential(session_token)

            # Update account record with encrypted credentials
            aws_account.aws_access_key_id = encrypted_access_key
            aws_account.aws_secret_access_key = encrypted_secret_key
            aws_account.default_region = region
            aws_account.session_token = encrypted_session_token

            self.db.commit()
            self.logger.info(
                f"Successfully stored credentials for AWS account {account_id}"
            )
            return True

        except Exception as e:
            self.logger.error(f"Failed to store AWS credentials: {str(e)}")
            self.db.rollback()
            return False

    def get_aws_credentials(self, account_id: int) -> Optional[AwsCredentials]:
        """
        Retrieve AWS credentials for an account.

        Args:
            account_id: AWS account database ID

        Returns:
            AwsCredentials object if found, None otherwise
        """
        try:
            # Try to get credentials from database first
            aws_account = (
                self.db.query(AwsAccount).filter(AwsAccount.id == account_id).first()
            )

            if (
                aws_account
                and aws_account.aws_access_key_id
                and aws_account.aws_secret_access_key
            ):
                # Decrypt stored credentials
                access_key_id = self._decrypt_credential(aws_account.aws_access_key_id)
                secret_access_key = self._decrypt_credential(
                    aws_account.aws_secret_access_key
                )
                region = aws_account.default_region or "us-east-1"

                session_token = None
                if aws_account.session_token:
                    session_token = self._decrypt_credential(aws_account.session_token)

                return AwsCredentials(
                    access_key_id=access_key_id,
                    secret_access_key=secret_access_key,
                    region=region,
                    session_token=session_token,
                )

            # Fallback to environment variables
            self.logger.info(
                f"No stored credentials for account {account_id}, checking environment"
            )
            return self._get_credentials_from_environment()

        except Exception as e:
            self.logger.error(f"Failed to retrieve AWS credentials: {str(e)}")
            # Fallback to environment variables on any error
            return self._get_credentials_from_environment()

    def _get_credentials_from_environment(self) -> Optional[AwsCredentials]:
        """
        Get AWS credentials from environment variables.

        Returns:
            AwsCredentials object if environment variables are set, None otherwise
        """
        try:
            access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
            secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
            session_token = os.getenv("AWS_SESSION_TOKEN")

            if access_key_id and secret_access_key:
                return AwsCredentials(
                    access_key_id=access_key_id,
                    secret_access_key=secret_access_key,
                    region=region,
                    session_token=session_token,
                )

            self.logger.warning("No AWS credentials found in environment variables")
            return None

        except Exception as e:
            self.logger.error(f"Failed to get credentials from environment: {str(e)}")
            return None

    def validate_aws_credentials(
        self, credentials: AwsCredentials
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate AWS credentials by testing authentication.

        Args:
            credentials: AwsCredentials object to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Create boto3 session with provided credentials
            session = boto3.Session(
                aws_access_key_id=credentials.access_key_id,
                aws_secret_access_key=credentials.secret_access_key,
                aws_session_token=credentials.session_token,
                region_name=credentials.region,
            )

            # Test credentials by calling STS get-caller-identity
            sts_client = session.client("sts")
            response = sts_client.get_caller_identity()

            account_id = response.get("Account")
            user_arn = response.get("Arn")

            self.logger.info(
                f"Credentials validated for account {account_id}, ARN: {user_arn}"
            )
            return True, None

        except NoCredentialsError:
            error_msg = "No AWS credentials provided"
            self.logger.error(error_msg)
            return False, error_msg
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "InvalidUserID.NotFound":
                error_msg = "Invalid AWS access key ID"
            elif error_code == "SignatureDoesNotMatch":
                error_msg = "Invalid AWS secret access key"
            elif error_code == "TokenRefreshRequired":
                error_msg = "AWS session token has expired"
            else:
                error_msg = f"AWS API error: {e.response['Error']['Message']}"

            self.logger.error(f"Credential validation failed: {error_msg}")
            return False, error_msg
        except Exception as e:
            error_msg = f"Credential validation error: {str(e)}"
            self.logger.error(error_msg)
            return False, error_msg
