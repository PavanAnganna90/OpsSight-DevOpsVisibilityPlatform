"""
Time Series Anomaly Detection

Specialized algorithms for detecting anomalies in time series data including:
- Seasonal decomposition
- Change point detection
- Trend analysis
- Seasonal pattern violations
- Forecasting-based anomaly detection
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

# Time series analysis
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

# Change point detection
import ruptures as rpt

# Scientific computing
from scipy import stats
from scipy.signal import find_peaks
import warnings
warnings.filterwarnings('ignore')

from .anomaly_detector import AnomalyResult, AnomalyType


class TimeSeriesAnomalyType(str, Enum):
    """Types of time series anomalies."""
    LEVEL_SHIFT = "level_shift"
    TREND_CHANGE = "trend_change"
    SEASONAL_VIOLATION = "seasonal_violation"
    VOLATILITY_CHANGE = "volatility_change"
    OUTLIER = "outlier"
    PATTERN_CHANGE = "pattern_change"


@dataclass
class ChangePoint:
    """Detected change point in time series."""
    timestamp: datetime
    index: int
    change_type: TimeSeriesAnomalyType
    confidence: float
    magnitude: float
    metadata: Dict[str, Any]


class SeasonalAnomalyDetector:
    """Detect anomalies using seasonal decomposition."""
    
    def __init__(self, period: Optional[int] = None, model: str = 'additive'):
        self.period = period
        self.model = model
        self.decomposition = None
        self.threshold_multiplier = 3.0
        self.logger = logging.getLogger(__name__)
    
    def fit(self, ts: pd.Series, timestamp_col: Optional[pd.Series] = None):
        """Fit seasonal decomposition model."""
        if len(ts) < 2 * (self.period or 24):
            self.logger.warning("Insufficient data for seasonal decomposition")
            self.decomposition = None
            return
        
        try:
            self.decomposition = seasonal_decompose(
                ts,
                model=self.model,
                period=self.period,
                extrapolate_trend='freq'
            )
        except Exception as e:
            self.logger.error(f"Seasonal decomposition failed: {e}")
            self.decomposition = None
    
    def detect_anomalies(self, ts: pd.Series) -> List[bool]:
        """Detect seasonal anomalies."""
        if self.decomposition is None:
            return [False] * len(ts)
        
        # Use residuals for anomaly detection
        residuals = self.decomposition.resid.dropna()
        if len(residuals) == 0:
            return [False] * len(ts)
        
        # Calculate threshold based on residual statistics
        residual_std = residuals.std()
        residual_mean = residuals.mean()
        threshold = self.threshold_multiplier * residual_std
        
        # Detect anomalies
        anomalies = []
        for i, value in enumerate(ts):
            if i < len(residuals):
                is_anomaly = abs(residuals.iloc[i] - residual_mean) > threshold
                anomalies.append(is_anomaly)
            else:
                anomalies.append(False)
        
        return anomalies


class ChangePointDetector:
    """Detect change points in time series."""
    
    def __init__(self, method: str = 'pelt', min_size: int = 10):
        self.method = method
        self.min_size = min_size
        self.logger = logging.getLogger(__name__)
    
    def detect_change_points(
        self, 
        ts: pd.Series, 
        timestamps: Optional[pd.Series] = None
    ) -> List[ChangePoint]:
        """Detect change points using ruptures library."""
        if len(ts) < 2 * self.min_size:
            return []
        
        change_points = []
        
        try:
            # Mean change detection
            algo_mean = rpt.Pelt(model="rbf", min_size=self.min_size).fit(ts.values)
            mean_changes = algo_mean.predict(pen=10)
            
            # Variance change detection
            algo_var = rpt.Pelt(model="rbf", min_size=self.min_size).fit(ts.values)
            var_changes = algo_var.predict(pen=10)
            
            # Combine change points
            all_changes = set(mean_changes[:-1] + var_changes[:-1])  # Remove last element (end of series)
            
            for change_idx in all_changes:
                if change_idx > 0 and change_idx < len(ts):
                    # Calculate change magnitude
                    before_window = ts.iloc[max(0, change_idx-10):change_idx]
                    after_window = ts.iloc[change_idx:min(len(ts), change_idx+10)]
                    
                    if len(before_window) > 0 and len(after_window) > 0:
                        magnitude = abs(after_window.mean() - before_window.mean())
                        
                        # Determine change type
                        mean_diff = after_window.mean() - before_window.mean()
                        var_diff = after_window.var() - before_window.var()
                        
                        if abs(mean_diff) > abs(var_diff):
                            change_type = TimeSeriesAnomalyType.LEVEL_SHIFT
                        else:
                            change_type = TimeSeriesAnomalyType.VOLATILITY_CHANGE
                        
                        # Calculate confidence (simplified)
                        confidence = min(1.0, magnitude / (ts.std() + 1e-8))
                        
                        timestamp = timestamps.iloc[change_idx] if timestamps is not None else datetime.now()
                        
                        change_point = ChangePoint(
                            timestamp=timestamp,
                            index=change_idx,
                            change_type=change_type,
                            confidence=confidence,
                            magnitude=magnitude,
                            metadata={
                                'before_mean': before_window.mean(),
                                'after_mean': after_window.mean(),
                                'before_var': before_window.var(),
                                'after_var': after_window.var()
                            }
                        )
                        change_points.append(change_point)
        
        except Exception as e:
            self.logger.error(f"Change point detection failed: {e}")
        
        return change_points


class ForecastingAnomalyDetector:
    """Detect anomalies using forecasting models."""
    
    def __init__(self, model_type: str = 'arima', forecast_horizon: int = 1):
        self.model_type = model_type
        self.forecast_horizon = forecast_horizon
        self.model = None
        self.prediction_interval = 0.95
        self.logger = logging.getLogger(__name__)
    
    def fit(self, ts: pd.Series, order: Tuple[int, int, int] = (1, 1, 1)):
        """Fit forecasting model."""
        try:
            if self.model_type == 'arima':
                self.model = ARIMA(ts, order=order)
                self.fitted_model = self.model.fit()
            elif self.model_type == 'exponential_smoothing':
                self.model = ExponentialSmoothing(ts, trend='add', seasonal='add')
                self.fitted_model = self.model.fit()
            elif self.model_type == 'sarimax':
                self.model = SARIMAX(ts, order=order, seasonal_order=(1, 1, 1, 12))
                self.fitted_model = self.model.fit()
            else:
                raise ValueError(f"Unknown model type: {self.model_type}")
                
        except Exception as e:
            self.logger.error(f"Model fitting failed: {e}")
            self.fitted_model = None
    
    def detect_anomalies(self, ts: pd.Series, window_size: int = 50) -> List[bool]:
        """Detect anomalies using rolling forecasts."""
        if self.fitted_model is None:
            return [False] * len(ts)
        
        anomalies = [False] * len(ts)
        
        for i in range(window_size, len(ts)):
            try:
                # Use rolling window for prediction
                train_data = ts.iloc[i-window_size:i]
                
                # Refit model on rolling window
                if self.model_type == 'arima':
                    temp_model = ARIMA(train_data, order=(1, 1, 1))
                    temp_fitted = temp_model.fit()
                    forecast = temp_fitted.forecast(steps=1)
                    conf_int = temp_fitted.get_forecast(steps=1).conf_int()
                elif self.model_type == 'exponential_smoothing':
                    temp_model = ExponentialSmoothing(train_data)
                    temp_fitted = temp_model.fit()
                    forecast = temp_fitted.forecast(steps=1)
                    # Simple confidence interval for exponential smoothing
                    residuals = temp_fitted.resid
                    std_error = residuals.std()
                    z_score = stats.norm.ppf((1 + self.prediction_interval) / 2)
                    margin = z_score * std_error
                    conf_int = pd.DataFrame({
                        'lower': [forecast[0] - margin],
                        'upper': [forecast[0] + margin]
                    })
                else:
                    continue
                
                # Check if actual value is outside prediction interval
                actual_value = ts.iloc[i]
                lower_bound = conf_int.iloc[0, 0]
                upper_bound = conf_int.iloc[0, 1]
                
                if actual_value < lower_bound or actual_value > upper_bound:
                    anomalies[i] = True
                
            except Exception as e:
                self.logger.debug(f"Forecast anomaly detection failed at index {i}: {e}")
                continue
        
        return anomalies


class TrendAnomalyDetector:
    """Detect trend anomalies in time series."""
    
    def __init__(self, window_size: int = 20, threshold: float = 2.0):
        self.window_size = window_size
        self.threshold = threshold
        self.logger = logging.getLogger(__name__)
    
    def detect_trend_changes(self, ts: pd.Series) -> List[bool]:
        """Detect sudden changes in trend direction."""
        if len(ts) < 2 * self.window_size:
            return [False] * len(ts)
        
        anomalies = [False] * len(ts)
        
        # Calculate rolling trends
        trends = []
        for i in range(self.window_size, len(ts) - self.window_size):
            # Calculate trend before and after current point
            before_window = ts.iloc[i-self.window_size:i]
            after_window = ts.iloc[i:i+self.window_size]
            
            # Linear regression to get trend slopes
            x_before = np.arange(len(before_window))
            x_after = np.arange(len(after_window))
            
            slope_before = np.polyfit(x_before, before_window.values, 1)[0]
            slope_after = np.polyfit(x_after, after_window.values, 1)[0]
            
            # Check for significant trend change
            trend_change = abs(slope_after - slope_before)
            trend_std = np.std([slope_before, slope_after])
            
            if trend_std > 0 and trend_change > self.threshold * trend_std:
                anomalies[i] = True
        
        return anomalies


class TimeSeriesAnomalyDetector:
    """
    Comprehensive time series anomaly detection system.
    
    Combines multiple time series-specific algorithms for robust
    anomaly detection in temporal data.
    """
    
    def __init__(self, enable_seasonal: bool = True, enable_changepoint: bool = True,
                 enable_forecasting: bool = True, enable_trend: bool = True):
        self.enable_seasonal = enable_seasonal
        self.enable_changepoint = enable_changepoint
        self.enable_forecasting = enable_forecasting
        self.enable_trend = enable_trend
        
        self.seasonal_detector = SeasonalAnomalyDetector() if enable_seasonal else None
        self.changepoint_detector = ChangePointDetector() if enable_changepoint else None
        self.forecasting_detector = ForecastingAnomalyDetector() if enable_forecasting else None
        self.trend_detector = TrendAnomalyDetector() if enable_trend else None
        
        self.logger = logging.getLogger(__name__)
    
    def detect_anomalies(
        self, 
        df: pd.DataFrame,
        value_col: str,
        timestamp_col: str,
        entity_col: Optional[str] = None
    ) -> List[AnomalyResult]:
        """Detect anomalies in time series data."""
        results = []
        
        # Sort by timestamp
        df_sorted = df.sort_values(timestamp_col)
        
        if entity_col:
            # Process each entity separately
            for entity in df_sorted[entity_col].unique():
                entity_data = df_sorted[df_sorted[entity_col] == entity]
                entity_results = self._detect_anomalies_single_series(
                    entity_data, value_col, timestamp_col, entity
                )
                results.extend(entity_results)
        else:
            # Process single time series
            results = self._detect_anomalies_single_series(
                df_sorted, value_col, timestamp_col
            )
        
        return results
    
    def _detect_anomalies_single_series(
        self, 
        df: pd.DataFrame,
        value_col: str,
        timestamp_col: str,
        entity: Optional[str] = None
    ) -> List[AnomalyResult]:
        """Detect anomalies in a single time series."""
        if len(df) < 10:
            return []
        
        ts = df[value_col]
        timestamps = pd.to_datetime(df[timestamp_col])
        
        # Initialize anomaly flags
        anomaly_flags = {
            'seasonal': [False] * len(ts),
            'changepoint': [False] * len(ts),
            'forecasting': [False] * len(ts),
            'trend': [False] * len(ts)
        }
        
        anomaly_scores = {
            'seasonal': [0.0] * len(ts),
            'changepoint': [0.0] * len(ts),
            'forecasting': [0.0] * len(ts),
            'trend': [0.0] * len(ts)
        }
        
        # Seasonal anomaly detection
        if self.enable_seasonal and self.seasonal_detector:
            try:
                self.seasonal_detector.fit(ts)
                seasonal_anomalies = self.seasonal_detector.detect_anomalies(ts)
                anomaly_flags['seasonal'] = seasonal_anomalies
                
                # Calculate seasonal anomaly scores
                if self.seasonal_detector.decomposition:
                    residuals = self.seasonal_detector.decomposition.resid.fillna(0)
                    residual_std = residuals.std()
                    for i, residual in enumerate(residuals):
                        if i < len(ts):
                            anomaly_scores['seasonal'][i] = abs(residual) / (residual_std + 1e-8)
                            
            except Exception as e:
                self.logger.error(f"Seasonal anomaly detection failed: {e}")
        
        # Change point detection
        if self.enable_changepoint and self.changepoint_detector:
            try:
                change_points = self.changepoint_detector.detect_change_points(ts, timestamps)
                for cp in change_points:
                    if 0 <= cp.index < len(ts):
                        anomaly_flags['changepoint'][cp.index] = True
                        anomaly_scores['changepoint'][cp.index] = cp.confidence
            except Exception as e:
                self.logger.error(f"Change point detection failed: {e}")
        
        # Forecasting-based detection
        if self.enable_forecasting and self.forecasting_detector and len(ts) > 50:
            try:
                self.forecasting_detector.fit(ts)
                forecast_anomalies = self.forecasting_detector.detect_anomalies(ts)
                anomaly_flags['forecasting'] = forecast_anomalies
                
                # Simple scoring for forecasting anomalies
                for i, is_anomaly in enumerate(forecast_anomalies):
                    anomaly_scores['forecasting'][i] = 1.0 if is_anomaly else 0.0
                    
            except Exception as e:
                self.logger.error(f"Forecasting anomaly detection failed: {e}")
        
        # Trend anomaly detection
        if self.enable_trend and self.trend_detector:
            try:
                trend_anomalies = self.trend_detector.detect_trend_changes(ts)
                anomaly_flags['trend'] = trend_anomalies
                
                # Simple scoring for trend anomalies
                for i, is_anomaly in enumerate(trend_anomalies):
                    anomaly_scores['trend'][i] = 1.0 if is_anomaly else 0.0
                    
            except Exception as e:
                self.logger.error(f"Trend anomaly detection failed: {e}")
        
        # Combine results
        results = []
        for i in range(len(ts)):
            # Check if any detector flagged this point
            is_anomaly_list = [anomaly_flags[method][i] for method in anomaly_flags.keys()]
            is_anomaly = any(is_anomaly_list)
            
            # Combine anomaly scores
            scores = [anomaly_scores[method][i] for method in anomaly_scores.keys()]
            combined_score = max(scores) if scores else 0.0
            
            # Determine anomaly type
            anomaly_type = AnomalyType.POINT_ANOMALY
            if anomaly_flags['changepoint'][i]:
                anomaly_type = AnomalyType.CONTEXTUAL_ANOMALY
            elif anomaly_flags['seasonal'][i]:
                anomaly_type = AnomalyType.CONTEXTUAL_ANOMALY
            
            # Create result
            if is_anomaly or combined_score > 0:
                result = AnomalyResult(
                    timestamp=timestamps.iloc[i],
                    value=float(ts.iloc[i]),
                    is_anomaly=is_anomaly,
                    anomaly_score=combined_score,
                    anomaly_type=anomaly_type,
                    confidence=min(1.0, combined_score),
                    explanation={
                        'methods_triggered': [method for method, flag in anomaly_flags.items() if flag[i]],
                        'method_scores': {method: score[i] for method, score in anomaly_scores.items()},
                        'entity': entity
                    },
                    metadata={
                        'ts_index': i,
                        'entity': entity,
                        'detection_methods': list(anomaly_flags.keys())
                    }
                )
                results.append(result)
        
        self.logger.info(f"Detected {len([r for r in results if r.is_anomaly])} anomalies in time series")
        return results
    
    def analyze_time_series_properties(self, ts: pd.Series) -> Dict[str, Any]:
        """Analyze time series properties for better anomaly detection."""
        analysis = {}
        
        # Basic statistics
        analysis['basic_stats'] = {
            'mean': float(ts.mean()),
            'std': float(ts.std()),
            'min': float(ts.min()),
            'max': float(ts.max()),
            'length': len(ts)
        }
        
        # Stationarity tests
        try:
            adf_stat, adf_pvalue, _, _, adf_critical, _ = adfuller(ts.dropna())
            analysis['stationarity'] = {
                'adf_statistic': adf_stat,
                'adf_pvalue': adf_pvalue,
                'is_stationary_adf': adf_pvalue < 0.05,
                'adf_critical_values': adf_critical
            }
        except Exception as e:
            self.logger.warning(f"ADF test failed: {e}")
            analysis['stationarity'] = {'error': str(e)}
        
        # Seasonality detection
        try:
            # Simple seasonality check using autocorrelation
            from statsmodels.tsa.stattools import acf
            autocorrelations = acf(ts.dropna(), nlags=min(50, len(ts)//2), fft=True)
            
            # Find peaks in autocorrelation
            peaks, _ = find_peaks(autocorrelations[1:], height=0.1)
            analysis['seasonality'] = {
                'has_seasonality': len(peaks) > 0,
                'potential_periods': [int(p + 1) for p in peaks[:3]],  # Top 3 periods
                'max_autocorr': float(np.max(autocorrelations[1:]))
            }
        except Exception as e:
            self.logger.warning(f"Seasonality analysis failed: {e}")
            analysis['seasonality'] = {'error': str(e)}
        
        # Trend analysis
        try:
            x = np.arange(len(ts))
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, ts.values)
            analysis['trend'] = {
                'slope': slope,
                'r_squared': r_value**2,
                'p_value': p_value,
                'has_significant_trend': p_value < 0.05,
                'trend_direction': 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'flat'
            }
        except Exception as e:
            self.logger.warning(f"Trend analysis failed: {e}")
            analysis['trend'] = {'error': str(e)}
        
        return analysis