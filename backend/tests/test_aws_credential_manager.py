"""
Unit tests for AWS Credential Manager Service.
Tests secure credential storage, encryption, and validation functionality.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import base64
from datetime import datetime
from cryptography.fernet import Fernet

from app.services.aws_credential_manager import (
    AwsCredentialManager,
    AwsCredentials,
    CredentialEncryptionError,
)
from app.models.aws_cost import AwsAccount


class TestAwsCredentialManager:
    """Test cases for AWS Credential Manager"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def mock_aws_account(self):
        """Mock AWS account record"""
        account = Mock()
        account.id = 1
        account.aws_access_key_id = None
        account.aws_secret_access_key = None
        account.default_region = "us-east-1"
        account.session_token = None
        return account

    @pytest.fixture
    def sample_credentials(self):
        """Sample AWS credentials for testing"""
        return AwsCredentials(
            access_key_id="AKIAIOSFODNN7EXAMPLE",
            secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            region="us-east-1",
            session_token=None,
        )

    @pytest.fixture
    def credential_manager(self, mock_db):
        """Credential manager instance with mock encryption"""
        with patch.object(AwsCredentialManager, "_initialize_encryption") as mock_init:
            # Mock Fernet cipher
            mock_cipher = Mock()
            mock_cipher.encrypt.return_value = b"encrypted_data"
            mock_cipher.decrypt.return_value = b"decrypted_data"
            mock_init.return_value = mock_cipher

            manager = AwsCredentialManager(mock_db)
            return manager

    def test_init(self, mock_db):
        """Test credential manager initialization"""
        with patch.object(AwsCredentialManager, "_initialize_encryption") as mock_init:
            mock_init.return_value = Mock()
            manager = AwsCredentialManager(mock_db)

            assert manager.db == mock_db
            assert manager.logger is not None
            mock_init.assert_called_once()

    def test_init_with_custom_key(self, mock_db):
        """Test initialization with custom encryption key"""
        custom_key = "custom-encryption-key"
        with patch.object(AwsCredentialManager, "_initialize_encryption") as mock_init:
            mock_init.return_value = Mock()
            manager = AwsCredentialManager(mock_db, custom_key)

            mock_init.assert_called_once_with(custom_key)

    @patch("app.services.aws_credential_manager.Fernet")
    @patch("app.services.aws_credential_manager.PBKDF2HMAC")
    def test_initialize_encryption_default(self, mock_pbkdf2, mock_fernet, mock_db):
        """Test encryption initialization with default settings"""
        mock_kdf = Mock()
        mock_kdf.derive.return_value = b"derived_key"
        mock_pbkdf2.return_value = mock_kdf

        with patch("os.getenv") as mock_getenv:
            mock_getenv.side_effect = lambda key, default: default

            manager = AwsCredentialManager(mock_db)

            # Should use default values and create Fernet instance
            mock_pbkdf2.assert_called_once()
            mock_fernet.assert_called_once()

    def test_initialize_encryption_failure(self, mock_db):
        """Test encryption initialization failure"""
        with patch("app.services.aws_credential_manager.Fernet") as mock_fernet:
            mock_fernet.side_effect = Exception("Encryption error")

            with pytest.raises(CredentialEncryptionError):
                AwsCredentialManager(mock_db)

    def test_encrypt_credential(self, credential_manager):
        """Test credential encryption"""
        test_credential = "test-credential"

        # Mock the cipher suite to return specific encrypted data
        credential_manager._cipher_suite.encrypt.return_value = b"encrypted_test_data"

        result = credential_manager._encrypt_credential(test_credential)

        # Should return base64 encoded encrypted data
        assert isinstance(result, str)
        credential_manager._cipher_suite.encrypt.assert_called_once_with(
            test_credential.encode()
        )

    def test_encrypt_credential_failure(self, credential_manager):
        """Test credential encryption failure"""
        credential_manager._cipher_suite.encrypt.side_effect = Exception(
            "Encryption failed"
        )

        with pytest.raises(CredentialEncryptionError):
            credential_manager._encrypt_credential("test-credential")

    def test_decrypt_credential(self, credential_manager):
        """Test credential decryption"""
        encrypted_data = base64.urlsafe_b64encode(b"encrypted_test_data").decode()
        credential_manager._cipher_suite.decrypt.return_value = b"decrypted_credential"

        result = credential_manager._decrypt_credential(encrypted_data)

        assert result == "decrypted_credential"
        credential_manager._cipher_suite.decrypt.assert_called_once()

    def test_decrypt_credential_failure(self, credential_manager):
        """Test credential decryption failure"""
        credential_manager._cipher_suite.decrypt.side_effect = Exception(
            "Decryption failed"
        )

        with pytest.raises(CredentialEncryptionError):
            credential_manager._decrypt_credential("invalid_encrypted_data")

    def test_store_aws_credentials_success(
        self, credential_manager, mock_aws_account, sample_credentials
    ):
        """Test successful credential storage"""
        # Mock database query
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            mock_aws_account
        )

        # Mock encryption
        credential_manager._encrypt_credential = Mock(
            side_effect=["enc_key", "enc_secret", "enc_token"]
        )

        result = credential_manager.store_aws_credentials(
            account_id=1,
            access_key_id=sample_credentials.access_key_id,
            secret_access_key=sample_credentials.secret_access_key,
            region=sample_credentials.region,
            session_token="test-session-token",
        )

        assert result is True
        assert mock_aws_account.aws_access_key_id == "enc_key"
        assert mock_aws_account.aws_secret_access_key == "enc_secret"
        assert mock_aws_account.session_token == "enc_token"
        credential_manager.db.commit.assert_called_once()

    def test_store_aws_credentials_account_not_found(self, credential_manager):
        """Test credential storage when account doesn't exist"""
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            None
        )

        result = credential_manager.store_aws_credentials(
            account_id=999,
            access_key_id="test-key",
            secret_access_key="test-secret",
            region="us-east-1",
        )

        assert result is False

    def test_store_aws_credentials_failure(self, credential_manager, mock_aws_account):
        """Test credential storage failure"""
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            mock_aws_account
        )
        credential_manager._encrypt_credential = Mock(
            side_effect=Exception("Encryption failed")
        )

        result = credential_manager.store_aws_credentials(
            account_id=1,
            access_key_id="test-key",
            secret_access_key="test-secret",
            region="us-east-1",
        )

        assert result is False
        credential_manager.db.rollback.assert_called_once()

    def test_get_aws_credentials_from_database(
        self, credential_manager, mock_aws_account
    ):
        """Test retrieving credentials from database"""
        # Set up mock account with encrypted credentials
        mock_aws_account.aws_access_key_id = "encrypted_key"
        mock_aws_account.aws_secret_access_key = "encrypted_secret"
        mock_aws_account.session_token = "encrypted_token"
        mock_aws_account.default_region = "us-west-2"

        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            mock_aws_account
        )
        credential_manager._decrypt_credential = Mock(
            side_effect=["decrypted_key", "decrypted_secret", "decrypted_token"]
        )

        result = credential_manager.get_aws_credentials(1)

        assert result is not None
        assert result.access_key_id == "decrypted_key"
        assert result.secret_access_key == "decrypted_secret"
        assert result.session_token == "decrypted_token"
        assert result.region == "us-west-2"

    def test_get_aws_credentials_fallback_to_environment(self, credential_manager):
        """Test fallback to environment variables"""
        # Mock no database credentials
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            None
        )

        # Mock environment credentials
        credential_manager._get_credentials_from_environment = Mock(
            return_value=AwsCredentials(
                access_key_id="env_key",
                secret_access_key="env_secret",
                region="us-east-1",
            )
        )

        result = credential_manager.get_aws_credentials(1)

        assert result is not None
        assert result.access_key_id == "env_key"
        credential_manager._get_credentials_from_environment.assert_called_once()

    @patch("os.getenv")
    def test_get_credentials_from_environment_success(
        self, mock_getenv, credential_manager
    ):
        """Test getting credentials from environment variables"""
        mock_getenv.side_effect = lambda key, default=None: {
            "AWS_ACCESS_KEY_ID": "env_access_key",
            "AWS_SECRET_ACCESS_KEY": "env_secret_key",
            "AWS_DEFAULT_REGION": "us-west-1",
            "AWS_SESSION_TOKEN": "env_session_token",
        }.get(key, default)

        result = credential_manager._get_credentials_from_environment()

        assert result is not None
        assert result.access_key_id == "env_access_key"
        assert result.secret_access_key == "env_secret_key"
        assert result.region == "us-west-1"
        assert result.session_token == "env_session_token"

    @patch("os.getenv")
    def test_get_credentials_from_environment_missing(
        self, mock_getenv, credential_manager
    ):
        """Test environment variables missing"""
        mock_getenv.return_value = None

        result = credential_manager._get_credentials_from_environment()

        assert result is None

    @patch("app.services.aws_credential_manager.boto3.Session")
    def test_validate_aws_credentials_success(
        self, mock_session, credential_manager, sample_credentials
    ):
        """Test successful credential validation"""
        # Mock STS client response
        mock_sts = Mock()
        mock_sts.get_caller_identity.return_value = {
            "Account": "123456789012",
            "Arn": "arn:aws:iam::123456789012:user/testuser",
        }
        mock_session.return_value.client.return_value = mock_sts

        is_valid, error_msg = credential_manager.validate_aws_credentials(
            sample_credentials
        )

        assert is_valid is True
        assert error_msg is None
        mock_sts.get_caller_identity.assert_called_once()

    @patch("app.services.aws_credential_manager.boto3.Session")
    def test_validate_aws_credentials_invalid_key(
        self, mock_session, credential_manager, sample_credentials
    ):
        """Test validation with invalid access key"""
        from botocore.exceptions import ClientError

        mock_sts = Mock()
        mock_sts.get_caller_identity.side_effect = ClientError(
            {"Error": {"Code": "InvalidUserID.NotFound", "Message": "Invalid user"}},
            "GetCallerIdentity",
        )
        mock_session.return_value.client.return_value = mock_sts

        is_valid, error_msg = credential_manager.validate_aws_credentials(
            sample_credentials
        )

        assert is_valid is False
        assert "Invalid AWS access key ID" in error_msg

    @patch("app.services.aws_credential_manager.boto3.Session")
    def test_test_cost_explorer_permissions_success(
        self, mock_session, credential_manager, sample_credentials
    ):
        """Test successful Cost Explorer permission check"""
        # Mock Cost Explorer client
        mock_ce = Mock()
        mock_ce.get_cost_and_usage.return_value = {"ResultsByTime": []}
        mock_session.return_value.client.return_value = mock_ce

        has_permissions, error_msg = credential_manager.test_cost_explorer_permissions(
            sample_credentials
        )

        assert has_permissions is True
        assert error_msg is None
        mock_ce.get_cost_and_usage.assert_called_once()

    @patch("app.services.aws_credential_manager.boto3.Session")
    def test_test_cost_explorer_permissions_denied(
        self, mock_session, credential_manager, sample_credentials
    ):
        """Test Cost Explorer permissions denied"""
        from botocore.exceptions import ClientError

        mock_ce = Mock()
        mock_ce.get_cost_and_usage.side_effect = ClientError(
            {"Error": {"Code": "AccessDeniedException", "Message": "Access denied"}},
            "GetCostAndUsage",
        )
        mock_session.return_value.client.return_value = mock_ce

        has_permissions, error_msg = credential_manager.test_cost_explorer_permissions(
            sample_credentials
        )

        assert has_permissions is False
        assert "Access denied to Cost Explorer API" in error_msg

    def test_rotate_credentials_success(self, credential_manager, sample_credentials):
        """Test successful credential rotation"""
        credential_manager.validate_aws_credentials = Mock(return_value=(True, None))
        credential_manager.test_cost_explorer_permissions = Mock(
            return_value=(True, None)
        )
        credential_manager.store_aws_credentials = Mock(return_value=True)

        result = credential_manager.rotate_credentials(1, sample_credentials)

        assert result is True
        credential_manager.validate_aws_credentials.assert_called_once()
        credential_manager.store_aws_credentials.assert_called_once()

    def test_rotate_credentials_invalid(self, credential_manager, sample_credentials):
        """Test credential rotation with invalid credentials"""
        credential_manager.validate_aws_credentials = Mock(
            return_value=(False, "Invalid credentials")
        )

        result = credential_manager.rotate_credentials(1, sample_credentials)

        assert result is False

    def test_delete_stored_credentials_success(
        self, credential_manager, mock_aws_account
    ):
        """Test successful credential deletion"""
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            mock_aws_account
        )

        result = credential_manager.delete_stored_credentials(1)

        assert result is True
        assert mock_aws_account.aws_access_key_id is None
        assert mock_aws_account.aws_secret_access_key is None
        assert mock_aws_account.session_token is None
        credential_manager.db.commit.assert_called_once()

    def test_delete_stored_credentials_not_found(self, credential_manager):
        """Test credential deletion when account not found"""
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            None
        )

        result = credential_manager.delete_stored_credentials(999)

        assert result is False

    def test_get_credential_status_with_database_credentials(
        self, credential_manager, mock_aws_account
    ):
        """Test credential status with database credentials"""
        # Mock database credentials exist
        mock_aws_account.aws_access_key_id = "encrypted_key"
        credential_manager.db.query.return_value.filter.return_value.first.return_value = (
            mock_aws_account
        )

        # Mock credential retrieval and validation
        mock_credentials = AwsCredentials("key", "secret", "us-east-1")
        credential_manager.get_aws_credentials = Mock(return_value=mock_credentials)
        credential_manager.validate_aws_credentials = Mock(return_value=(True, None))
        credential_manager.test_cost_explorer_permissions = Mock(
            return_value=(True, None)
        )

        status = credential_manager.get_credential_status(1)

        assert status["has_credentials"] is True
        assert status["source"] == "database"
        assert status["valid"] is True
        assert status["has_cost_explorer_access"] is True

    def test_get_credential_status_no_credentials(self, credential_manager):
        """Test credential status when no credentials found"""
        credential_manager.get_aws_credentials = Mock(return_value=None)

        status = credential_manager.get_credential_status(1)

        assert status["has_credentials"] is False
        assert status["source"] == "none"
        assert status["valid"] is False
