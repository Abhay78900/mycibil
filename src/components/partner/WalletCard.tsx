import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, TrendingUp } from 'lucide-react';

interface WalletCardProps {
  balance: number;
  onAddFunds: () => void;
}

export default function WalletCard({ balance, onAddFunds }: WalletCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-secondary to-secondary/80 p-6 text-secondary-foreground">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-background/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm opacity-80">Wallet Balance</p>
            <p className="text-3xl font-bold">₹{balance.toLocaleString()}</p>
          </div>
        </div>
        <Button 
          onClick={onAddFunds}
          className="w-full bg-background/20 hover:bg-background/30 text-secondary-foreground border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Funds
        </Button>
      </div>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-success" />
          <span>Reports cost ₹50-199 from wallet</span>
        </div>
      </CardContent>
    </Card>
  );
}
