import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from research import quality_report, analytical_flags, parse_number, is_http_url
from server import demo_bundle

class ResearchTests(unittest.TestCase):
    def test_blank_data_never_research_ready(self):
        report = quality_report([], [], {})
        self.assertEqual(report['score'], 0)
        self.assertFalse(report['researchReady'])

    def test_full_metrics_without_market_not_ready(self):
        metrics={'revenueGrowth':10,'epsGrowth':9,'roe':17,'debtEquity':.2,'pe':19,
                 'fcfPositive':True,'historicalYears':5,
                 'sourceUrls':['https://example.com/a','https://example.com/b'],
                 'managementNotes':'Verified from annual report'}
        report=quality_report([], [{'title':'a'}]*3, metrics)
        self.assertEqual(report['score'], 85)
        self.assertFalse(report['researchReady'])

    def test_full_coverage(self):
        metrics={'revenueGrowth':10,'epsGrowth':9,'roe':17,'debtEquity':.2,'pe':19,
                 'fcfPositive':True,'historicalYears':5,
                 'sourceUrls':['https://nseindia.com/a','https://company.com/b'],
                 'managementNotes':'Management commentary'}
        r=quality_report([{'date':'2026-01-01','close':10}]*60,[{'title':'a'}]*3,metrics)
        self.assertEqual(r['score'], 100)
        self.assertTrue(r['researchReady'])

    def test_non_http_source_invalid(self):
        self.assertFalse(is_http_url('javascript:alert(1)'))
        self.assertFalse(is_http_url('http://example.com'))
        self.assertTrue(is_http_url('https://example.com/a'))

    def test_financial_flags(self):
        flags=analytical_flags({'pe':40,'epsGrowth':-2,'debtEquity':2,'fcfPositive':False})
        self.assertEqual(len(flags), 4)
        self.assertIn('Negative EPS growth', ' '.join(flags))

    def test_safe_numeric_parser(self):
        self.assertIsNone(parse_number(float('nan')))
        self.assertIsNone(parse_number(True))
        self.assertEqual(parse_number('12.56'),12.56)

    def test_demo_labeled_simulated(self):
        demo=demo_bundle()
        self.assertTrue(demo['simulation'])
        self.assertIn('SIMULATED',demo['market']['source'])
        self.assertGreater(len(demo['market']['prices']),60)
        self.assertTrue(all('SIMULATION:' in a['title'] for a in demo['news']['articles']))

if __name__=='__main__': unittest.main()
